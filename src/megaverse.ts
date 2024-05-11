import 'dotenv/config';
import pLimit from 'p-limit';
import xior from 'xior';
import errorRetryPlugin from 'xior/plugins/error-retry';

interface IGoalMap {
  data: string[][];
}

interface IMapContent {
  type?: number;
  color?: 'white' | 'blue' | 'purple' | 'red';
  direction?: 'up' | 'down' | 'left' | 'right';
}

interface ISecondJson {
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

interface IMegaverseAPI {
  getMap(): Promise<IGoalMap>;
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

const BASE_URL: string | undefined = process.env.API_BASE_URL; // Adjusted to use environment variable for base URL
const CANDIDATE_ID: string | undefined = process.env.CANDIDATE_ID; // Adjusted to use environment variable for base URL

const http = xior.create();

http.plugins.use(
  errorRetryPlugin({
    retryTimes: 100,
    retryInterval: (count, config, error) => {
      // Customize retry interval logic as needed
      //return Math.min(10 * 1000, 2 * (1000 * 2 ** (count - 1))); // Increase the interval by 1 second with each retry
      return 2 * (1000 * 2 ** (count - 1)); // Increase the interval by 1 second with each retry
    },
    onRetry: (config, error, count) => {
      console.log(
        `${config.method} ${config.url} retry ${count} times due to ${error.message}`
      );
    },
  })
);

export class MegaverseAPI implements IMegaverseAPI {
  //export class MegaVerse {
  async createXShape(): Promise<void> {
    const size = 11;
    const tasks = [];

    // Collect all operations into batches
    for (let i = 2; i < size - 2; i++) {
      tasks.push({row: i, column: i});
      tasks.push({row: i, column: size - 1 - i});
    }
    const limit = pLimit(1);

    // If `limit` can handle batches or if another utility method is better suited for batch processing, use it here

    tasks.map(
      task => () => limit(() => this.createEntity(EntityName.polyanet, task))
    );
    await Promise.all(tasks);
  }

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

          const request = http
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

          requests.push(request);
        }
      });
    });

    // Wait for all the requests to complete
    //await Promise.all(requests);
  }

  public async getGoal(): Promise<IGoalMap> {
    const response = await http.get(`${BASE_URL}/map/${CANDIDATE_ID}/goal`);
    const goalMap = response.data?.goal;
    console.log('Goal Map: ', goalMap);
    return {data: response.data?.goal};
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

  public async getMap(): Promise<ISecondJson> {
    const response = await http.get(`${BASE_URL}/map/${CANDIDATE_ID}`);
    const goalMap = response.data?.map.content;

    console.log('Map: ', goalMap);
    //return {goalMap};
    //return {data: response.data?.goal};

    return {map: {content: goalMap}};
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

        requests.push(postRequest);
      });
    });

    console.log('All map entities have been processed successfully.');
  }

  validate() {
    console.log('validation logic here');
    const goal = this.getGoal();
    const map = this.getMap();

    const currentMap = this.normalizeCurrentMap(map.map.content);
    const areEqual = this.compareArrays(goal.goal, currentMap);
    console.log('Do the JSON files represent the same data?', areEqual);
  }

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

  private async deleteEntity(row: number, column: number): Promise<void> {
    const endpoint = `${BASE_URL}/polyanets?row=${encodeURIComponent(
      row
    )}&column=${encodeURIComponent(column)}&candidateId=${encodeURIComponent(
      CANDIDATE_ID as string
    )}`;

    try {
      await xior.delete<{field1: string; field2: number}>(endpoint);

      // Log only if necessary for debugging, consider using a debug log level or conditionally log based on an environment variable
      console.debug(`Polyanet deleted at (${row}, ${column})`);
    } catch (error: any) {
      console.error(
        `Failed to delete Polyanet at (${row}, ${column}): ${this.parseErrorMessage(
          error
        )}`
      );
    }
  }

  private async createEntity(
    entityType: EntityName,
    entityDetail: EntityDetail
  ): Promise<void> {
    const {row, column, color, direction} = entityDetail;
    const postData = {
      row,
      column,
      candidateId: CANDIDATE_ID,
      ...(color && {color}),
      ...(direction && {direction}),
    };

    console.log(postData);
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
