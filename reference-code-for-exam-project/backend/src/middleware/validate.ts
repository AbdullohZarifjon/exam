import type { Context, Next } from 'hono';
import type { ZodSchema } from 'zod';

/**
 * Generic Zod validator. Supports schemas with `body`, `params`, `query`
 * (any combination). Validates and replaces the values on the context.
 *
 * @example
 *   const schema = z.object({ body: z.object({ email: z.string().email() }) });
 *   router.post('/login', v(schema), handler);
 */
export const v =
  <T extends ZodSchema>(schema: T) =>
  async (c: Context, next: Next) => {
    const shape =
      (
        schema as unknown as { _def?: { shape?: () => Record<string, ZodSchema> } }
      )._def?.shape?.() ?? {};
    const data: Record<string, unknown> = {};

    if (shape.body) {
      data.body = await c.req.json().catch(() => ({}));
    }
    if (shape.params) {
      data.params = c.req.param();
    }
    if (shape.query) {
      data.query = c.req.query();
    }

    const parsed = schema.parse(data);

    if (parsed.body) c.set('body' as never, parsed.body as never);
    if (parsed.params) c.set('params' as never, parsed.params as never);
    if (parsed.query) c.set('query' as never, parsed.query as never);

    await next();
  };
