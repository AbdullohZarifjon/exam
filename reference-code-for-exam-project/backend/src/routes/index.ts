import { Hono } from 'hono';
import health from './health.routes.js';
import auth from './auth.routes.js';
import exam from './exam.routes.js';
import question from './question.routes.js';
import attempt from './attempt.routes.js';
import face from './face.routes.js';
import upload from './upload.routes.js';

const api = new Hono();

api.route('/health', health);
api.route('/auth', auth);
api.route('/exams', exam);
api.route('/questions', question);
api.route('/attempts', attempt);
api.route('/face', face);
api.route('/uploads', upload);

export default api;
