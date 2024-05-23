process.env.API_BASE_URL = 'https://challenge.crossmint.io/api';
process.env.CANDIDATE_ID = '1e79d4a5-5c94-4b60-99ff-8f451933c596';

// add all jest-extended matchers
import * as matchers from 'jest-extended';
expect.extend(matchers);

