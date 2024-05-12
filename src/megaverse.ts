import 'dotenv/config';
import pLimit from 'p-limit';
import xior from 'xior';
import errorRetryPlugin from 'xior/plugins/error-retry';
import ky from 'ky';

const BASE_URL: string | undefined = process.env.API_BASE_URL; // Adjusted to use environment variable for base URL
const CANDIDATE_ID: string | undefined = process.env.CANDIDATE_ID; // Adjusted to use environment variable for base URL

interface IGoalMap {
  data: string[][];
}

interface IMapContent {
  type?: number;
  color?: 'white' | 'blue' | 'purple' | 'red';
  direction?: 'up' | 'down' | 'left' | 'right';
}

interface ICurrentMap {
  map: {
    content: (IMapContent | null)[][];
  };
}

interface ITypeMap {
  [key: number]: any; // Adjust 'any' to be more specific if possible
}

const TYPE_MAP: ITypeMap = {
  0: 'POLYANET',
  1: {
    white: 'WHITE_SOLOON',
    blue: 'BLUE_SOLOON',
    purple: 'PURPLE_SOLOON',
    red: 'RED_SOLOON',
  },
  2: {
    up: 'UP_COMETH',
    down: 'DOWN_COMETH',
    left: 'LEFT_COMETH',
    right: 'RIGHT_COMETH',
  },
};

const URL_MAP: ITypeMap = {
  0: `${BASE_URL}polyanets`,
  1: `${BASE_URL}soloons`,
  2: `${BASE_URL}comeths`,
};

interface IMegaverseAPI {
  getMap(): Promise<ICurrentMap>;
  showMap(map: IGoalMap): void;
}

interface IPayload {
  row: string;
  column: string;
  candidateId: string;
}

type Color = 'blue' | 'red' | 'purple' | 'white';

type Direction = 'up' | 'down' | 'left' | 'right';

const SPACE_EMOJI = '\u{1F30C}';
const POLYANET_EMOJI = '\u{1FA90}';
const SOLOON_EMOJI = '\u{1F319}';
const COMETH_EMOJI = '\u{2604}';


export class MegaverseAPI implements IMegaverseAPI {





  public async postPolyanets(goalMap: IGoalMap): Promise<void> {
    let requests: Promise<any>[] = [];

    goalMap.data.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        if (cell === 'POLYANET') {
          const payload = {
            row: rowIndex,
            column: columnIndex,
            candidateId: CANDIDATE_ID,
          };
          //console.log("Payload: ", payload);



        const request = ky.post(`${BASE_URL}polyanets`, {json: payload,retry: {
            limit: 100,
            methods: ['post'],
            statusCodes: [429],
            backoffLimit: Infinity,
            delay: attemptCount => 1 * (2 ** (attemptCount - 1)) * 1000
        }}).json();


/*
          const request = ky
            .post(`${BASE_URL}polyanets`, payload, {
              enableRetry: true, // Enable retry for POST requests
              retryTimes: 100, // Custom retry times if needed
            })
            .then(() =>
              console.log(
                `Successfully posted POLYANET at row ${rowIndex}, column ${columnIndex}`
              )
            )
            .catch(error =>
              console.error(
                `Failed to post POLYANET at row ${rowIndex}, column ${columnIndex}: ${error}`
              )
            );
*/
          requests.push(request);
        }
      });
    });

    // Wait for all the requests to complete
    //await Promise.all(requests);
  }

  //public async getGoal(): Promise<IGoalMap> {
    public async getGoal() {
        const response = await ky.get(`${BASE_URL}/map/${CANDIDATE_ID}/goal`);
    console.log('Response: ', response);
 /*
    console.log('Response: ', response.data?.goal)
    const goalMap = response.data?.goal;
    console.log('Goal Map: ', goalMap);
    return {data: response.data?.goal};
    */
  }

  public showMap(map: IGoalMap): void {
    // we want 4 empty spaces on the left as it looks better in the console, just for aesthetics purposes.
    const leftMargin = ' '.repeat(4);
    console.log('Here is your Goal Map');
    const mapRows = map.data.map(
      row =>
        leftMargin +
        row
          .map(cell =>
            cell === 'SPACE'
              ? SPACE_EMOJI
              : cell === 'POLYANET'
                ? POLYANET_EMOJI
                : cell === 'RIGHT_COMETH'
                  ? COMETH_EMOJI
                  : cell === 'UP_COMETH'
                    ? COMETH_EMOJI
                    : cell === 'LEFT_COMETH'
                      ? COMETH_EMOJI
                      : cell === 'DOWN_COMETH'
                        ? COMETH_EMOJI
                        : cell === 'WHITE_SOLOON'
                          ? SOLOON_EMOJI
                          : cell === 'BLUE_SOLOON'
                            ? SOLOON_EMOJI
                            : cell === 'PURPLE_SOLOON'
                              ? SOLOON_EMOJI
                              : ' '
          )
          .join('')
    );

    mapRows.forEach(rowString => console.log(rowString));

  }

  public async getMap(): Promise<ICurrentMap> {
    const response = await ky.get(`${BASE_URL}/map/${CANDIDATE_ID}`).json<ICurrentMap>();




    //console.log(`${BASE_URL}/map/${CANDIDATE_ID}`);
    //console.log('Response: ', response);
    
    //const goalMap = response.map.content;

    //console.log('Map: ', goalMap);
    return response;
    //return {data: response.data?.goal};

    //return {map: {content:  [[null],[null]] }};
  }

  public async processMapEntities(goalMap: IGoalMap): Promise<void> {
    let requests: Promise<void>[] = [];

    goalMap.data.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        let payload: any = {
          row: rowIndex,
          column: columnIndex,
          candidateId: CANDIDATE_ID,
        };
        let url = BASE_URL;

        switch (cell) {
          case 'POLYANET':
            url += 'polyanets';
            break;
          case 'BLUE_SOLOON':
          case 'RED_SOLOON':
          case 'PURPLE_SOLOON':
          case 'WHITE_SOLOON':
            url += 'soloons';
            payload.color = cell.split('_')[0].toLowerCase();
            break;
          case 'UP_COMETH':
          case 'DOWN_COMETH':
          case 'LEFT_COMETH':
          case 'RIGHT_COMETH':
            url += 'comeths';
            payload.direction = cell.split('_')[0].toLowerCase();
            break;
          default:
            return; // Skip processing if it's not a special entity
        }


        //const request = ky.post(`${url}`, {json: payload}).json();
        const request = ky.post(`${url}`, {json: payload,retry: {
            limit: 100,
            methods: ['post'],
            statusCodes: [429],
            backoffLimit: Infinity,
            delay: attemptCount => 1 * (2 ** (attemptCount - 1)) * 1000
        }}).json();


/*
        const postRequest = http
          .post(`${url}`, payload, {
            enableRetry: true,
            retryTimes: 100,
          })
          .then(() =>
            console.log(
              `Posted ${cell} at row ${rowIndex}, column ${columnIndex}`
            )
          )
          .catch(error =>
            console.error(
              `Error posting ${cell} at row ${rowIndex}, column ${columnIndex}: ${error}`
            )
          );
*/
        //requests.push(request);
      });
    });

    console.log('All map entities have been processed successfully.');
  }

  validate() {
    console.log('validation logic here');
    const goal = this.getGoal();
    const map = this.getMap();


    //https://challenge.crossmint.io/api/map/1e79d4a5-5c94-4b60-99ff-8f451933c596/validate
    /*
    const currentMap = this.normalizeCurrentMap(map.map.content);
    const areEqual = this.compareArrays(goal.goal, currentMap);
    console.log('Do the JSON files represent the same data?', areEqual);
    */
  }


  public async reset() {
    console.log('reset logic here');
    const map = await this.getMap();

    let requests: Promise<any>[] = [];

    map.map.content.forEach((row, rowIndex) => {
      row.forEach(async (cell, columnIndex) => {
        if (cell !== null) {
          const payload = {
            row: rowIndex,
            column: columnIndex,
            candidateId: CANDIDATE_ID,
          };
          console.log('Payload: ', payload);

          const endpoint = `${URL_MAP[cell.type as number]}`;

          console.log('Endpoint: ', endpoint);

          try {
            const request = ky.delete(endpoint, {json: payload,retry: {
                limit: 100,
                methods: ['delete'],
                statusCodes: [429],
                backoffLimit: Infinity,
                delay: attemptCount => 1 * (2 ** (attemptCount - 1)) * 1000
            }}).json();
            requests.push(request);
          } catch (error) {
            console.error(`Error deleting at ${endpoint}: `, error);
          }
        }
      });
    });

    // Wait for all delete requests to complete
    //await Promise.all(requests);
    console.log('All deletes have been processed.');
  }


/*
  public async reset() {
    console.log('reset logic here');
    //const goal = this.getGoal();
    const map = await this.getMap();

    let requests: Promise<any>[] = [];

    map.map.content.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        if (cell !== null) {
          const payload = {
            row: rowIndex,
            column: columnIndex,
            candidateId: CANDIDATE_ID,
          };
          console.log('Payload: ', payload);

          const endpoint = `${URL_MAP[cell.type as number]}/)}`;

          console.log('Endpoint: ', endpoint);

          const json = ky.delete(endpoint, {json: payload}).json();
        }
      });
    });
  }
*/
  /*
            const endpoint = `${URL_MAP[cell.type as number]}/?row=${encodeURIComponent(
                rowIndex
              )}&column=${encodeURIComponent(columnIndex)}&candidateId=${encodeURIComponent(
                CANDIDATE_ID as string
              )}`;
*/

  //this.deleteEntity(cell.type as number,rowIndex,columnIndex);

  /*
            const request = http
            .delete(`${endpoint}`,payload, {
              enableRetry: true, // Enable retry for POST requests
              retryTimes: 100, // Custom retry times if needed
            })
*/

  /*
            const request =  http.delete(`${endpoint}`, {
                params: payload,
                headers: {
                  'content-type': 'application/json',
                },
              })
            .then(() =>
              console.log(
                `Successfully posted POLYANET at row ${rowIndex}, column ${columnIndex}`
              )
            )
            .catch(error =>
              console.error(
                `Failed to post POLYANET at row ${rowIndex}, column ${columnIndex}: ${error}`
              )
            );

*/
  /*
            await got.delete(endpoint, {
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(payload)
              });


*/

  /*
    const currentMap = this.normalizeCurrentMap(map.map.content);
    const areEqual = this.compareArrays(goal.goal, currentMap);
    console.log('Do the JSON files represent the same data?', areEqual);
    */

  //requests.push(request);

  // Normalizes the second JSON structure
  normalizeCurrentMap(content: (IMapContent | null)[][]): string[][] {
    return content.map(row =>
      row.map(cell => {
        if (cell === null) return 'SPACE';
        if (cell.type === 1 && cell.color)
          return TYPE_MAP[cell.type][cell.color];
        if (cell.type === 2 && cell.direction)
          return TYPE_MAP[cell.type][cell.direction];
        return TYPE_MAP[cell.type as number] || 'SPACE';
      })
    );
  }

  // Compares two arrays deeply
  compareArrays(arr1: string[][], arr2: string[][]): boolean {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (!arr2[i] || arr1[i].length !== arr2[i].length) return false;
      for (let j = 0; j < arr1[i].length; j++) {
        if (arr1[i][j] !== arr2[i][j]) return false;
      }
    }
    return true;
  }

  normalizeMap(content: (IMapContent | null)[][]): string[][] {
    return content.map(row =>
      row.map(cell => {
        if (cell === null) return 'SPACE';
        if (cell.type !== undefined && cell.type in TYPE_MAP) {
          if (cell.type === 1 && cell.color) {
            return TYPE_MAP[cell.type][cell.color];
          }
          if (cell.type === 2 && cell.direction) {
            return TYPE_MAP[cell.type][cell.direction];
          }
          return TYPE_MAP[cell.type];
        }
        return 'SPACE';
      })
    );
  }

  private async deleteEntity(
    type: number,
    row: number,
    column: number
  ): Promise<void> {
    /*
    let requests: Promise<any>[] = [];


    const endpoint = `${URL_MAP[type]}/?row=${encodeURIComponent(
      row
    )}&column=${encodeURIComponent(column)}&candidateId=${encodeURIComponent(
      CANDIDATE_ID as string
    )}`;
    console.log("Endpoint: ", endpoint);
    const request = http
    .post(`${endpoint}`, payload, {
      enableRetry: true, // Enable retry for POST requests
      retryTimes: 100, // Custom retry times if needed
    })
    .then(() =>
      console.log(
        `Successfully posted POLYANET at row ${rowIndex}, column ${columnIndex}`
      )
    )
    .catch(error =>
      console.error(
        `Failed to post POLYANET at row ${rowIndex}, column ${columnIndex}: ${error}`
      )
    );

  requests.push(request);
  */
    /*
    try {
      await http.delete<{row: number; column: number}>(endpoint);

      // Log only if necessary for debugging, consider using a debug log level or conditionally log based on an environment variable
      console.debug(`Polyanet deleted at (${row}, ${column})`);
    } catch (error: any) {
      console.error(
        `Failed to delete Polyanet at (${row}, ${column}): ${this.parseErrorMessage(
          error
        )}`
      );
    }
*/
  }

  private parseErrorMessage(error: any): string {
    // Improved error message parsing
    if (error.response) {
      return `${error.response.status} ${
        error.response.statusText
      }: ${JSON.stringify(error.response.data)}`;
    }
    return error.message;
  }
}
