import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { teamMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function requireTeamMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session?.userId;
  const teamId = parseInt((req.params.id || req.params.teamId) as string, 10);

  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (!teamId || isNaN(teamId)) {
    res.status(400).json({ error: "Invalid team ID" });
    return;
  }

  try {
    const [member] = await db
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.userId, userId),
        ),
      );

    if (!member) {
      res.status(403).json({ error: "Not a member of this team" });
      return;
    }

    (req as any).teamMember = member;
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function requireTeamOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session?.userId;
  const teamId = parseInt((req.params.id || req.params.teamId) as string, 10);

  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (!teamId || isNaN(teamId)) {
    res.status(400).json({ error: "Invalid team ID" });
    return;
  }

  try {
    const [member] = await db
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.userId, userId),
        ),
      );

    if (!member || member.role !== "owner") {
      res.status(403).json({ error: "Must be team owner" });
      return;
    }

    (req as any).teamMember = member;
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
