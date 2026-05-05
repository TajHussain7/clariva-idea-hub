import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ideasTable, analysesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { CreateIdeaBody, GetIdeaParams } from "@workspace/api-zod";
import { analyzeIdea } from "../lib/pipeline/analyzer.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

async function getIdeaWithAnalysis(ideaId: number, userId: number) {
  const [idea] = await db
    .select()
    .from(ideasTable)
    .where(and(eq(ideasTable.id, ideaId), eq(ideasTable.userId, userId)));

  if (!idea) return null;

  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.ideaId, ideaId));

  return { ...idea, analysis: analysis ?? null };
}

async function runAnalysisInBackground(ideaId: number, userId: number): Promise<void> {
  const idea = await db
    .select()
    .from(ideasTable)
    .where(and(eq(ideasTable.id, ideaId), eq(ideasTable.userId, userId)))
    .then((rows) => rows[0]);

  if (!idea) return;

  try {
    await db
      .update(ideasTable)
      .set({ status: "processing" })
      .where(eq(ideasTable.id, ideaId));

    await db
      .insert(analysesTable)
      .values({ ideaId, status: "processing" })
      .onConflictDoUpdate({ target: analysesTable.ideaId, set: { status: "processing" } });

    const result = await analyzeIdea(
      idea.title,
      idea.description,
      idea.domain,
      idea.complexity
    );

    await db
      .update(analysesTable)
      .set({
        status: "done",
        uniquenessScore: result.uniquenessScore,
        feasibilityScore: result.feasibilityScore,
        impactScore: result.impactScore,
        innovationScore: result.innovationScore,
        overallScore: result.overallScore,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        risks: result.risks,
        suggestions: result.suggestions,
        githubRepos: result.githubRepos,
        techStack: result.techStack,
        marketContext: result.marketContext,
        verdictSummary: result.verdictSummary,
      })
      .where(eq(analysesTable.ideaId, ideaId));

    await db
      .update(ideasTable)
      .set({ status: "analyzed" })
      .where(eq(ideasTable.id, ideaId));

    logger.info({ ideaId }, "Analysis complete");
  } catch (err) {
    logger.error({ err, ideaId }, "Analysis failed");

    await db
      .update(analysesTable)
      .set({ status: "failed" })
      .where(eq(analysesTable.ideaId, ideaId));

    await db
      .update(ideasTable)
      .set({ status: "failed" })
      .where(eq(ideasTable.id, ideaId));
  }
}

router.get("/ideas", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const ideas = await db
    .select()
    .from(ideasTable)
    .where(eq(ideasTable.userId, userId))
    .orderBy(ideasTable.createdAt);

  const ideaIds = ideas.map((i) => i.id);
  const analyses =
    ideaIds.length > 0
      ? await db
          .select()
          .from(analysesTable)
          .where(inArray(analysesTable.ideaId, ideaIds))
      : [];

  const analysisMap = new Map(analyses.map((a) => [a.ideaId, a]));

  res.json(
    ideas.map((idea) => ({
      ...idea,
      analysis: analysisMap.get(idea.id) ?? null,
    }))
  );
});

router.post("/ideas", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const parsed = CreateIdeaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, description, domain, complexity } = parsed.data;

  const [idea] = await db
    .insert(ideasTable)
    .values({
      userId,
      title,
      description,
      domain,
      complexity: complexity ?? 2,
      status: "pending",
    })
    .returning();

  req.log.info({ ideaId: idea.id }, "Idea created, queuing analysis");

  // Fire and forget — don't await
  runAnalysisInBackground(idea.id, userId).catch((err) =>
    logger.error({ err, ideaId: idea.id }, "Background analysis error")
  );

  res.status(201).json({ ...idea, analysis: null });
});

router.get("/ideas/compare", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const idsParam = req.query.ids;

  if (typeof idsParam !== "string" || !idsParam.trim()) {
    res.status(400).json({ error: "ids query param is required" });
    return;
  }

  const ids = idsParam
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);

  if (ids.length === 0) {
    res.status(400).json({ error: "No valid idea IDs provided" });
    return;
  }

  const ideas = await db
    .select()
    .from(ideasTable)
    .where(and(inArray(ideasTable.id, ids), eq(ideasTable.userId, userId)));

  const analyses =
    ideas.length > 0
      ? await db
          .select()
          .from(analysesTable)
          .where(inArray(analysesTable.ideaId, ids))
      : [];

  const analysisMap = new Map(analyses.map((a) => [a.ideaId, a]));

  res.json(
    ideas.map((idea) => ({
      ...idea,
      analysis: analysisMap.get(idea.id) ?? null,
    }))
  );
});

router.get("/ideas/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const params = GetIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid idea ID" });
    return;
  }

  const result = await getIdeaWithAnalysis(params.data.id, userId);
  if (!result) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }

  res.json(result);
});

router.delete("/ideas/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const params = GetIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid idea ID" });
    return;
  }

  const [deleted] = await db
    .delete(ideasTable)
    .where(and(eq(ideasTable.id, params.data.id), eq(ideasTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/ideas/:id/analyze", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const params = GetIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid idea ID" });
    return;
  }

  const [idea] = await db
    .select()
    .from(ideasTable)
    .where(and(eq(ideasTable.id, params.data.id), eq(ideasTable.userId, userId)));

  if (!idea) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }

  runAnalysisInBackground(params.data.id, userId).catch((err) =>
    logger.error({ err, ideaId: params.data.id }, "Re-analysis error")
  );

  res.status(202).json({ ideaId: params.data.id, status: "processing" });
});

export default router;
