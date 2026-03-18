import fs from 'fs';
import SQLHandler from '../../../../app/services/assets/handlers/sql';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('SQLHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new SQLHandler().id()).toEqual(`StatWrap.${SQLHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include SQL files and exclude others', () => {
        const handler = new SQLHandler();
        // Valid files
        expect(handler.includeFile('/path/to/query.sql')).toBeTruthy();
        expect(handler.includeFile('/path/to/migration.SQL')).toBeTruthy();

        // Invalid files
        expect(handler.includeFile('/path/to/data.csv')).toBeFalsy();
        expect(handler.includeFile('/path/to/app.py')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile('/path/to/query.sql.bak')).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should return an empty array since SQL has no imports', () => {
        const libraries = new SQLHandler().getLibraries(
          'test.uri',
          'SELECT * FROM users;'
        );
        expect(libraries).toEqual([]);
      });
    });

    describe('getInputs', () => {
      it('should detect SELECT FROM statements', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          'SELECT * FROM users;'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'SELECT FROM - users',
          type: 'data',
          path: 'users',
        });
      });

      it('should detect multiple FROM tables', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          `
          SELECT u.name, o.total
          FROM users u
          WHERE u.id IN (SELECT user_id FROM orders);
          `
        );
        expect(inputs.length).toEqual(2);
        expect(inputs[0].path).toEqual('users');
        expect(inputs[1].path).toEqual('orders');
      });

      it('should detect JOIN statements', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          `
          SELECT u.name, o.total
          FROM users u
          INNER JOIN orders o ON u.id = o.user_id
          LEFT JOIN payments p ON o.id = p.order_id;
          `
        );
        expect(inputs.length).toEqual(3);
        expect(inputs[0].path).toEqual('users');
        expect(inputs[1].path).toEqual('orders');
        expect(inputs[2].path).toEqual('payments');
      });

      it('should detect schema-qualified table names', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          'SELECT * FROM public.users;'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0].path).toEqual('public.users');
      });

      it('should not duplicate tables', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          `
          SELECT * FROM users;
          SELECT * FROM users WHERE id = 1;
          `
        );
        expect(inputs.length).toEqual(1);
      });

      it('should ignore commented out lines', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          `
          -- SELECT * FROM old_table;
          SELECT * FROM active_table;
          /* SELECT * FROM another_old_table; */
          `
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0].path).toEqual('active_table');
      });

      it('should detect PostgreSQL/Redshift COPY FROM as file read', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          "COPY users FROM '/data/users.csv' DELIMITER ',' CSV HEADER;"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read (COPY) - /data/users.csv',
          type: 'data',
          path: '"/data/users.csv"',
        });
      });

      it('should detect Snowflake COPY INTO table as file read', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          "COPY INTO my_table FROM 's3://bucket/data.csv';"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read (COPY) - s3://bucket/data.csv',
          type: 'data',
          path: '"s3://bucket/data.csv"',
        });
      });

      it('should detect PostgreSQL COPY TO as table read', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          "COPY users TO '/data/export.csv';"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'Table Read (COPY TO FILE) - users',
          type: 'data',
          path: 'users',
        });
      });

      it('should detect MySQL LOAD DATA INFILE as file read', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          "LOAD DATA LOCAL INFILE '/tmp/data.txt' INTO TABLE my_table;"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read (LOAD DATA) - /tmp/data.txt',
          type: 'data',
          path: '"/tmp/data.txt"',
        });
      });

      it('should detect SQL Server BULK INSERT as file read', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          "BULK INSERT dbo.MyTable FROM 'C:\\Data\\file.csv';"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read (BULK INSERT) - C:\\Data\\file.csv',
          type: 'data',
          path: '"C:\\Data\\file.csv"',
        });
      });

      it('should detect psql \\copy import as file read', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          "\\copy dbo.PERSON FROM 'person.csv' DELIMITER ',' CSV HEADER;"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read (COPY) - person.csv',
          type: 'data',
          path: '"person.csv"',
        });
      });

      it('should detect psql \\copy (subquery) TO as table read', () => {
        const inputs = new SQLHandler().getInputs(
          'test.uri',
          "\\copy (select * from dbo.PERSON) TO 'PERSON.csv' csv header;"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          type: 'data',
          path: 'dbo.PERSON',
        });
      });
    });

    describe('getOutputs', () => {
      it('should detect INSERT INTO statements', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "INSERT INTO users (name, email) VALUES ('John', 'john@test.com');"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'INSERT INTO - users',
          type: 'data',
          path: 'users',
        });
      });

      it('should detect CREATE TABLE statements', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          'CREATE TABLE employees (id INT, name VARCHAR(100));'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'CREATE TABLE - employees',
          type: 'data',
          path: 'employees',
        });
      });

      it('should detect CREATE TABLE IF NOT EXISTS', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          'CREATE TABLE IF NOT EXISTS logs (id INT, message TEXT);'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0].path).toEqual('logs');
      });

      it('should detect UPDATE statements', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "UPDATE users SET name = 'Jane' WHERE id = 1;"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'UPDATE - users',
          type: 'data',
          path: 'users',
        });
      });

      it('should detect DELETE FROM statements', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          'DELETE FROM sessions WHERE expired = true;'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'DELETE FROM - sessions',
          type: 'data',
          path: 'sessions',
        });
      });

      it('should detect DROP TABLE statements', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          'DROP TABLE IF EXISTS temp_data;'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'DROP TABLE - temp_data',
          type: 'data',
          path: 'temp_data',
        });
      });

      it('should detect ALTER TABLE statements', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          'ALTER TABLE users ADD COLUMN age INT;'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'ALTER TABLE - users',
          type: 'data',
          path: 'users',
        });
      });

      it('should detect multiple output operations', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          `
          CREATE TABLE reports (id INT, data TEXT);
          INSERT INTO reports (id, data) VALUES (1, 'test');
          UPDATE logs SET status = 'done';
          DELETE FROM temp_cache WHERE expired = true;
          `
        );
        expect(outputs.length).toEqual(3);
        expect(outputs[0].path).toEqual('reports');
        expect(outputs[1].path).toEqual('logs');
        expect(outputs[2].path).toEqual('temp_cache');
      });

      it('should detect PostgreSQL/Redshift COPY FROM as table write', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "COPY users FROM '/data/users.csv';"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'Table Write (COPY FROM) - users',
          type: 'data',
          path: 'users',
        });
      });

      it('should detect Snowflake COPY INTO table as table write', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "COPY INTO my_table FROM 's3://data.csv';"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'Table Write (COPY FROM) - my_table',
          type: 'data',
          path: 'my_table',
        });
      });

      it('should detect Snowflake COPY INTO file as file write', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "COPY INTO 's3://bucket/export.csv' FROM users;"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'File Write (COPY INTO) - s3://bucket/export.csv',
          type: 'data',
          path: '"s3://bucket/export.csv"',
        });
      });

      it('should detect PostgreSQL COPY TO as file write', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "COPY users TO '/data/export.csv';"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'File Write (COPY TO) - /data/export.csv',
          type: 'data',
          path: '"/data/export.csv"',
        });
      });

      it('should detect MySQL LOAD DATA INFILE as table write', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "LOAD DATA INFILE 'data.txt' INTO TABLE employees;"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'Table Write (LOAD DATA) - employees',
          type: 'data',
          path: 'employees',
        });
      });

      it('should detect SQL Server BULK INSERT as table write', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "BULK INSERT records FROM 'C:\\data.csv';"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'Table Write (BULK INSERT) - records',
          type: 'data',
          path: 'records',
        });
      });

      it('should detect psql \\copy import as table write', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "\\copy dbo.PERSON FROM 'person.csv' DELIMITER ',' CSV HEADER;"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'Table Write (COPY FROM) - dbo.PERSON',
          type: 'data',
          path: 'dbo.PERSON',
        });
      });

      it('should detect psql \\copy (subquery) TO as file write', () => {
        const outputs = new SQLHandler().getOutputs(
          'test.uri',
          "\\copy (select * from dbo.PERSON) TO 'PERSON.csv' csv header;"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'File Write (COPY TO) - PERSON.csv',
          type: 'data',
          path: '"PERSON.csv"',
        });
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid SQL file', () => {
        fs.readFileSync.mockReturnValue(
          'SELECT * FROM users; INSERT INTO logs (msg) VALUES (\'test\');'
        );

        const testAsset = {
          uri: '/path/to/query.sql',
          type: 'file',
          metadata: [],
        };

        const response = new SQLHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.SQLHandler',
          inputs: expect.arrayContaining([
            expect.objectContaining({ path: 'users' }),
          ]),
          outputs: expect.arrayContaining([
            expect.objectContaining({ path: 'logs' }),
          ]),
        });
      });
    });
  });
});