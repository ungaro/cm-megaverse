import 'dotenv/config';
import pLimit from 'p-limit';
import figlet from 'figlet';

import ky from 'ky';
import {SingleBar, MultiBar, Presets} from 'cli-progress';
import {EventEmitter} from 'events';

EventEmitter.defaultMaxListeners = Infinity;

const BASE_URL: string | undefined = process.env.API_BASE_URL; // Adjusted to use environment variable for base URL
const CANDIDATE_ID: string | undefined = process.env.CANDIDATE_ID; // Adjusted to use environment variable for base URL

export interface IGoalMap {
  data: (string | null)[][];
}

interface IGoalMapJSON {
  goal: string[][];
}

interface IMapContent {
  type?: number | null; // Allowing 'type' to be null
  color?: 'white' | 'blue' | 'purple' | 'red';
  direction?: 'up' | 'down' | 'left' | 'right';
}

export interface ICurrentMap {
  map: {
    content: (IMapContent | null)[][];
  };
}

interface ITypeMap {
  [key: number]: any; // Adjust 'any' to be more specific if possible
}

const URL_MAP: ITypeMap = {
  0: `${BASE_URL}/polyanets`,
  1: `${BASE_URL}/soloons`,
  2: `${BASE_URL}/comeths`,
};

interface IMegaverseAPI {
  getMap(): Promise<ICurrentMap>;
  showMap(map: ICurrentMap): void;
}
/*
interface IPayload {
  row: string;
  column: string;
  candidateId: string;
}

*/
const SPACE_EMOJI = '\u{1F30C}';
const POLYANET_EMOJI = '\u{1FA90}';
const SOLOON_EMOJI = '\u{1F319}';
const COMETH_EMOJI = '\u{2604}';

export class MegaverseAPI implements IMegaverseAPI {
  getBaseUrl(): string | undefined {
    return process.env.API_BASE_URL;
  }

  getCandidateId(): string | undefined {
    return process.env.CANDIDATE_ID;
  }

  public async phase1(): Promise<void> {
    const map = await this.getMap();
    const goal = await this.getGoal();

    const differences = await this.calculateDifferences(map, goal);

    const goalMap: IGoalMap = {
      data: differences,
    };

    const requests: Promise<Response>[] = [];
    const limit = pLimit(2);

    const multibar = new MultiBar(
      {
        clearOnComplete: true,
        stopOnComplete: true,
        forceRedraw: true,
        hideCursor: true,
        format:
          'progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}',
      },
      Presets.shades_grey
    );

    let barLength = 0;
    const bar1 = multibar.create(0, 0);

    goalMap.data.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        if (cell === 'POLYANET') {
          const payload = {
            row: rowIndex,
            column: columnIndex,
            candidateId: CANDIDATE_ID,
          };

          barLength++;

          requests.push(
            limit(() =>
              this.makeApiRequest(
                `${BASE_URL}/polyanets`,
                'post',
                payload,
                multibar,
                bar1
              )
            )
          );
        }
      });
    });

    bar1.setTotal(barLength);

    // If remote state is same as Goal, we've submitted all the payloads succesfully

    if (barLength === 0) {
      console.log('All submissions have been processed.');
      bar1.stop();
      return;
    }

    await Promise.all(requests);

    // stop the progress bar
    bar1.stop();

    // our local state says we don't have any remaining requests, but did all requests went through?
    // recursively call this function until remote state is exactly same as Goal

    this.phase1();
    console.log('All map entities have been processed successfully.');

    // Wait for all the requests to complete
  }

  public async getGoal(): Promise<IGoalMap> {
    try {
      const response = await ky
        .get(`${BASE_URL}/map/${CANDIDATE_ID}/goal`)
        .json<IGoalMapJSON>();
      return {
        data: response.goal,
      };
    } catch (error) {
      console.log(`Error: ${error} \n`);
      return {
        data: [],
      };
    }
  }

  public async getMap(): Promise<ICurrentMap> {
    try {
      const response = await ky
        .get(`${BASE_URL}/map/${CANDIDATE_ID}`)
        .json<ICurrentMap>();

      return {
        map: {
          content: response.map?.content,
        },
      };
    } catch (error) {
      console.log(`Error: ${error} \n`);
      return {
        map: {
          content: [],
        },
      };
    }
  }

  public getMapString(map: ICurrentMap): string[] {
    return map.map.content.map(row => {
      return row
        .map(cell => {
          if (cell === null) return SPACE_EMOJI;
          switch (cell.type) {
            case 0:
              return POLYANET_EMOJI;
            case 1:
              return SOLOON_EMOJI;
            case 2:
              return COMETH_EMOJI;
            default:
              return ' '; // Handles any unexpected cell type
          }
        })
        .join('');
    });
  }

  public getGoalString(map: IGoalMap): string[] {
    const leftMargin = ' '.repeat(4);
    return map.data.map(row => {
      return (
        leftMargin +
        row
          .map(cell => {
            switch (cell) {
              case 'SPACE':
                return SPACE_EMOJI;
              case 'POLYANET':
                return POLYANET_EMOJI;
              case 'RIGHT_COMETH':
              case 'UP_COMETH':
              case 'LEFT_COMETH':
              case 'DOWN_COMETH':
                return COMETH_EMOJI;
              case 'WHITE_SOLOON':
              case 'BLUE_SOLOON':
              case 'PURPLE_SOLOON':
                return SOLOON_EMOJI;
              default:
                return ' ';
            }
          })
          .join('')
      );
    });
  }

  public calculateDifferences(
    currentMap: ICurrentMap,
    goalMap: IGoalMap
  ): (string | null)[][] {
    const differenceMap: (string | null)[][] = [];

    goalMap.data.forEach((goalRow, rowIndex) => {
      const differenceRow: (string | null)[] = [];

      goalRow.forEach((goalCell, cellIndex) => {
        // Safely access the current cell or use 'null' if unavailable
        const currentCell =
          currentMap.map.content[rowIndex]?.[cellIndex] || null;

        if (!currentCell || this.cellTypeToString(currentCell) !== goalCell) {
          // Include the goal's cell if there is a difference or no current cell exists
          differenceRow.push(goalCell === 'SPACE' ? null : goalCell);
        } else {
          // If there is no difference, include null to indicate no change is needed
          differenceRow.push(null);
        }
      });

      differenceMap.push(differenceRow);
    });

    return differenceMap;
  }

  private cellTypeToString(cell: IMapContent | null): string {
    if (!cell) return 'SPACE'; // Handling null
    switch (cell.type) {
      case 0:
        return 'POLYANET';
      case 1:
        return (cell.color ?? 'unknown').toUpperCase() + '_SOLOON'; // Providing a default if undefined
      case 2:
        return (cell.direction ?? 'unknown').toUpperCase() + '_COMETH'; // Providing a default if undefined
      default:
        return 'SPACE';
    }
  }

  public showMap(map: ICurrentMap): void {
    map.map.content.forEach(row => {
      const rowString = row
        .map(cell => {
          if (cell === null) return SPACE_EMOJI;
          switch (cell.type) {
            case 0:
              return POLYANET_EMOJI;
            case 1:
              return SOLOON_EMOJI;
            case 2:
              return COMETH_EMOJI;
            default:
              return ' ';
          }
        })
        .join('');

      console.log(rowString);
    });
  }

  public showGoal(map: IGoalMap): void {
    // we want 4 empty spaces on the left as it looks better in the console, just for aesthetics purposes.
    const leftMargin = ' '.repeat(4);

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

  public async phase2(): Promise<void> {
    const map = await this.getMap();
    const goal = await this.getGoal();

    const differences = await this.calculateDifferences(map, goal);

    const goalMap: IGoalMap = {
      data: differences,
    };

    const requests: Promise<Response>[] = [];
    const limit = pLimit(2);

    const multibar = new MultiBar(
      {
        clearOnComplete: true,
        stopOnComplete: true,
        forceRedraw: true,
        hideCursor: true,
        format:
          'progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}',
      },
      Presets.shades_grey
    );

    let barLength = 0;
    const bar1 = multibar.create(0, 0);

    goalMap.data.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        const payload: any = {
          row: rowIndex,
          column: columnIndex,
          candidateId: CANDIDATE_ID,
        };
        let url = BASE_URL;

        switch (cell) {
          case 'POLYANET':
            url += '/polyanets';
            barLength++;
            break;
          case 'BLUE_SOLOON':
          case 'RED_SOLOON':
          case 'PURPLE_SOLOON':
          case 'WHITE_SOLOON':
            url += '/soloons';
            payload.color = cell.split('_')[0].toLowerCase();
            barLength++;
            break;
          case 'UP_COMETH':
          case 'DOWN_COMETH':
          case 'LEFT_COMETH':
          case 'RIGHT_COMETH':
            url += '/comeths';
            payload.direction = cell.split('_')[0].toLowerCase();
            barLength++;
            break;
          default:
            return;
        }

        //const request = ;
        requests.push(
          limit(() =>
            this.makeApiRequest(`${url}`, 'post', payload, multibar, bar1)
          )
        );
      });
    });
    bar1.setTotal(barLength);

    // If remote state is same as Goal, we've submitted all the payloads succesfully

    if (barLength === 0) {
      console.log('All submissions have been processed.');
      bar1.stop();
      return;
    }

    await Promise.all(requests);

    // stop the progress bar
    bar1.stop();

    // our local state says we don't have any remaining requests, but did all requests went through?
    // recursively call this function until remote state is exactly same as Goal

    this.phase2();
    console.log('All map entities have been processed successfully.');
  }

  public async reset() {
    console.log('RESETTING MAP to CLEAN STATE');
    const map = await this.getMap();
    const requests: Promise<any>[] = [];
    const limit = pLimit(1);
    const multibar = new MultiBar(
      {
        clearOnComplete: true,
        stopOnComplete: true,
        forceRedraw: true,
        hideCursor: true,
        format:
          'progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}',
      },
      Presets.shades_grey
    );

    let barLength = 0;
    const bar1 = multibar.create(0, 0);

    map.map.content.forEach((row, rowIndex) => {
      row.forEach(async (cell, columnIndex) => {
        if (cell !== null) {
          barLength++;
          const payload = {
            row: rowIndex,
            column: columnIndex,
            candidateId: CANDIDATE_ID,
          };

          const endpoint = `${URL_MAP[cell.type as number]}`;

          try {
            requests.push(
              limit(() =>
                this.makeApiRequest(
                  `${endpoint}`,
                  'delete',
                  payload,
                  multibar,
                  bar1
                )
              )
            );
          } catch (error) {
            console.error(`Error deleting at ${endpoint}: `, error);
          }
        }
      });
    });

    bar1.setTotal(barLength);

    if (barLength === 0) {
      console.log('All deletes have been processed.');
      bar1.stop();
      return;
    }
    await Promise.all(requests);
    this.reset();
    console.log('All deletes have been processed.');
  }

  async makeApiRequest(
    endpoint: string,
    method: 'post' | 'delete',
    payload: any,
    multibar: MultiBar,
    progress: SingleBar
  ): Promise<any> {
    try {
      const kyRequest = ky(endpoint, {
        method: method,
        json: payload,
        timeout: false,
        retry: {
          limit: 1000,
          methods: [method],
          statusCodes: [413, 429, 503],
          // Limit backoff's maximum time to 6 seconds as there is not much benefit beyond this point.
          backoffLimit: 6000,
          delay: attemptCount => 1.4 * 2 ** (attemptCount - 1) * 1000,
        },
        hooks: {
          beforeRetry: [
            async ({request, retryCount}) => {
              request.headers.set('x-megaverse-retry', retryCount.toString());
            },
          ],
          afterResponse: [
            (_request, _options, response) => {
              if (response.status === 200) {
                multibar.log(
                  `Processing:   ${JSON.stringify(_options.body)}  \n`
                );

                progress.increment();
              } else {
                multibar.log(
                  `RetryCount: ${Number(
                    _request.headers.get('x-megaverse-retry')
                  )} Body:  ${JSON.stringify(_options.body)}  \n`
                );
              }
            },
          ],
        },
      }).json();

      return kyRequest;
    } catch (error) {
      multibar.log(`Error during ${method} at ${endpoint}: \n`);
    }
  }
}
