import fs from 'fs';
import JavaHandler from '../../../../app/services/assets/handlers/java';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('JavaHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new JavaHandler().id()).toEqual(`StatWrap.${JavaHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include Java files and exclude others', () => {
        const handler = new JavaHandler();
        // Valid files
        expect(handler.includeFile('/path/to/Test.java')).toBeTruthy();
        expect(handler.includeFile('/path/to/Main.JAVA')).toBeTruthy();

        // Invalid files
        expect(handler.includeFile('/path/to/Test.class')).toBeFalsy();
        expect(handler.includeFile('/path/to/app.jar')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile('/path/to/Test.java.bak')).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should extract import statements', () => {
        const libraries = new JavaHandler().getLibraries(
          'test.uri',
          'import java.util.List;\nimport java.io.File;'
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({
          id: 'java.util.List',
          module: 'java.util',
          import: 'List',
          alias: null,
        });
        expect(libraries[1]).toMatchObject({
          id: 'java.io.File',
          module: 'java.io',
          import: 'File',
          alias: null,
        });
      });

      it('should detect wildcard imports', () => {
        const libraries = new JavaHandler().getLibraries(
          'test.uri',
          'import java.util.*;'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'java.util.*',
          module: 'java.util',
          import: '*',
          alias: null,
        });
      });

      it('should detect static imports', () => {
        const libraries = new JavaHandler().getLibraries(
          'test.uri',
          'import static java.lang.Math.PI;'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'java.lang.Math.PI',
          module: 'java.lang.Math',
          import: 'PI',
          alias: null,
        });
      });
    });

    describe('getInputs', () => {
      it('should detect file read operations', () => {
        const inputs = new JavaHandler().getInputs(
          'test.uri',
          'FileInputStream fis = new FileInputStream("input.txt");'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'FileInputStream - "input.txt"',
          type: 'data',
          path: '"input.txt"',
        });
      });

      it('should detect various file read classes', () => {
        const inputs = new JavaHandler().getInputs(
          'test.uri',
          `
          FileInputStream fis = new FileInputStream("input1.txt");
          FileReader fr = new FileReader("input2.txt");
          BufferedReader br = new BufferedReader(new FileReader("input3.txt"));
          Scanner scanner = new Scanner(new File("input4.txt"));
          byte[] data = Files.readAllBytes(Paths.get("input5.txt"));
          `
        );
        expect(inputs.length).toEqual(5);
        expect(inputs[0].id).toContain('BufferedReader');
        expect(inputs[1].id).toContain('FileInputStream');
        expect(inputs[2].id).toContain('FileReader');
        expect(inputs[3].id).toContain('Scanner');
        expect(inputs[4].id).toContain('readAllBytes');
      });

      it('should detect JDBC connections', () => {
        const inputs = new JavaHandler().getInputs(
          'test.uri',
          'Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/demodatabase");'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'JDBC - "jdbc:mysql://localhost:3306/demodatabase"',
          type: 'data',
          path: '"jdbc:mysql://localhost:3306/demodatabase"',
        });
      });
    });

    describe('getOutputs', () => {
      it('should detect file write operations', () => {
        const outputs = new JavaHandler().getOutputs(
          'test.uri',
          `
          FileOutputStream fos = new FileOutputStream("output1.txt");
          FileWriter fw = new FileWriter("output2.txt");
          BufferedWriter bw = new BufferedWriter(new FileWriter("output3.txt"));
          PrintWriter pw = new PrintWriter("output4.txt");
          `
        );
        expect(outputs.length).toEqual(4);
        expect(outputs[0].id).toContain('BufferedWriter');
        expect(outputs[1].id).toContain('FileOutputStream');
        expect(outputs[2].id).toContain('FileWriter');
        expect(outputs[3].id).toContain('PrintWriter');
      });

      it('should detect various file write operations', () => {
        const outputs = new JavaHandler().getOutputs(
          'test.uri',
          `
          FileOutputStream fos = new FileOutputStream("output1.txt");
          FileWriter fw = new FileWriter("output2.txt");
          PrintWriter pw = new PrintWriter("output4.txt");
          `
        );
        expect(outputs.length).toEqual(3);
        expect(outputs[0].id).toContain('FileOutputStream');
        expect(outputs[1].id).toContain('FileWriter');
        expect(outputs[2].id).toContain('PrintWriter');
      });

      it('should detect image write operations', () => {
        const outputs = new JavaHandler().getOutputs(
          'test.uri',
          'ImageIO.write(bufferedImage, "png", new File("chart.png"));'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'ImageIO.write - "chart.png"',
          type: 'figure',
          path: '"chart.png"',
        });
      });

      it('should detect chart export operations', () => {
        const outputs = new JavaHandler().getOutputs(
          'test.uri',
          `
          ChartUtilities.saveChartAsPNG(new File("chart1.png"), chart, 500, 300);
          ChartUtils.saveChartAsJPEG(new File("chart2.jpg"), chart, 500, 300);
          `
        );
        expect(outputs.length).toEqual(2);
        expect(outputs[0].id).toContain('chart1.png');
        expect(outputs[0].type).toEqual('figure');
        expect(outputs[1].id).toContain('chart2.jpg');
        expect(outputs[1].type).toEqual('figure');
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid Java file', () => {
        fs.readFileSync.mockReturnValue('import java.util.List;\npublic class Test {}');

        const testAsset = {
          uri: '/path/to/Test.java',
          type: 'file',
          metadata: [],
        };

        const response = new JavaHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.JavaHandler',
          libraries: [
            {
              id: 'java.util.List',
              module: 'java.util',
              import: 'List',
            }
          ]
        });
      });
    });
  });
});
