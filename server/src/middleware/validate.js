import { ValidationError } from '../utils/httpError.js';

const PARTS = ['body', 'query', 'params'];

/**
 * Checks parts of the request against zod schemas and answers 422 with one message per field
 * when something is wrong. On success the checked (and cleaned) values are placed in
 * `req.valid.body`, `req.valid.query` and `req.valid.params`; controllers read from there
 * and never touch the raw input. Fields the schema does not list are dropped by zod's
 * default object handling.
 *
 *   router.post('/', validate({ body: projectSchema }), controller.create);
 *
 * Put the messages in the schema (`z.string().min(1, 'Enter a title.')`): they are shown to
 * the client as they are.
 */
export function validate(schemas) {
  return function validateRequest(req, res, next) {
    const fieldErrors = {};
    const valid = {};

    for (const part of PARTS) {
      if (!schemas[part]) {
        continue;
      }
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) {
        valid[part] = result.data;
        continue;
      }
      for (const issue of result.error.issues) {
        const field = issue.path.length > 0 ? issue.path.join('.') : part;
        fieldErrors[field] ??= issue.message;
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return next(new ValidationError(fieldErrors));
    }

    req.valid = { ...req.valid, ...valid };
    return next();
  };
}
