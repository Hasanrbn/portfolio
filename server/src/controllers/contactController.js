import { sendSuccess } from '../utils/respond.js';

export const CONTACT_SUCCESS_MESSAGE = 'Your message has been sent.';

/**
 * Reads the request, calls the service, shapes the response. No rules live here.
 * Errors are not caught: Express 5 passes a rejected promise to the error handler.
 */
export function createContactController({ contactService }) {
  return {
    async submit(req, res) {
      await contactService.submit(req.body, { ip: req.ip });
      sendSuccess(res, { message: CONTACT_SUCCESS_MESSAGE }, 201);
    },
  };
}
