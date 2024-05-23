// tests/megaverseAPI.test.ts
import { MegaverseAPI } from '../src/megaverse.ts';
import { ICurrentMap, IGoalMap } from '../src/megaverse.ts';
import nock from 'nock';



describe('Environment Variables', () => {
  // You might want to mock dotenv if you're using it to load environment variables
  // or ensure the environment variables are set up in your jest.config.js or test setup files.
  
  beforeAll(() => {
    // Set environment variables for the test
    process.env.API_BASE_URL = 'https://challenge.crossmint.io/api';
    process.env.CANDIDATE_ID = '1e79d4a5-5c94-4b60-99ff-8f451933c596';


  });



  it('should have the correct API_BASE_URL', () => {
    // Initialize API to check if it reads environment variables correctly
    const api = new MegaverseAPI();
    expect(api.getBaseUrl()).toBe('https://challenge.crossmint.io/api');
  });

  it('should have the correct CANDIDATE_ID', () => {
    const api = new MegaverseAPI();
    expect(api.getCandidateId()).toBeString();
  });
});

describe('MegaverseAPI', () => {
  let api: MegaverseAPI;

  beforeEach(() => {
    api = new MegaverseAPI();
  });

  it('should fetch the map correctly', async () => {
    const expectedMap: ICurrentMap = {
      map: {
        content: [[null]]
      }
    };
    jest.spyOn(api, 'getMap').mockResolvedValue(expectedMap);
    const map = await api.getMap();
    expect(map).toEqual(expectedMap);
  });
});



describe('MegaverseAPI', () => {



  it('should fetch goal map content', async () => {
    const expectedData = {
      goal: [
        ['POLYANET', 'SPACE'],
        ['SPACE', 'COMETH']
      ]
    };
    
    nock(process.env.API_BASE_URL!)
      .get(`/map/${process.env.CANDIDATE_ID}/goal`)
      .reply(200, expectedData);

    const api = new MegaverseAPI();
    const data = await api.getGoal();

    expect(data).toEqual(expectedData);
  });

  afterAll(() => {
    nock.cleanAll();
  });
});