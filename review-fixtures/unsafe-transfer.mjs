// Evaluation fixture only. Never imported by the application or deployment.
// A verified login middleware has set req.user.id; no ownership filter follows.
export async function getTransferForUser(db, req) {
  const result = await db.query('SELECT id, amount, destination FROM transfers WHERE id = $1', [req.params.id]);
  return result.rows[0];
}
