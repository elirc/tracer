/** A typed error thrown deep and translated once at the edge (see server.ts error handler). */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
