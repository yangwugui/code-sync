import * as assert from 'assert';
import * as fs from 'fs';
import * as file_watcher from '../../src/file-watcher';
import * as path from 'path';
import * as settings from '../../src/settings';
import * as test_helpers from './test-helpers';

suite('file-watcher.ts', function() {
    let testingResources: test_helpers.TestingResources;
    let testDir: string;
    let testFile: string;
    let settingsFile: string;
    let snippetsDir: string;
    let snippetsFile: string;
    let writeCount: number;
    let watcher: file_watcher.FileWatcher;

    suiteSetup(function(done) {
        this.timeout(5000);
        // create directory for test, will clean up after test is complete
        testingResources = test_helpers.createTestingResources();
        testDir = testingResources.directories[0];
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir);
        }

        // file to watch
        testFile = path.join(testDir, 'testing.txt');
        testingResources.files.push(testFile);
        if (!fs.existsSync(testFile)) {
            fs.writeFileSync(testFile, Buffer.from(''));
        }

        // settings file required for FileWatcher, looks for settings.autoExport === true
        settingsFile = path.join(testDir, 'settings.json');
        testingResources.files.push(settingsFile);

        // create snippets directory for testing
        snippetsDir = path.join(testDir, 'snippets/');
        testingResources.directories.push(snippetsDir);
        if (!fs.existsSync(snippetsDir)) {
            fs.mkdirSync(snippetsDir);
        }

        snippetsFile = path.join(snippetsDir, 'json.json');
        testingResources.files.push(snippetsFile);
        // We create the snippets file here instead of in the test because this is much closer to how VSCode acts when
        // new snippet files are created. They are first created and saved by VSCode before being presented to the user.
        // This means that all subsequent user saves are change events rather than add events.
        fs.writeFileSync(snippetsFile, Buffer.from(''));

        const settingsObject = test_helpers.getDefaultSettings();
        settingsObject.settingsPath = testDir;
        fs.writeFileSync(settingsFile, Buffer.from(JSON.stringify(settingsObject)));
        
        const files: file_watcher.FileWatcherFiles = {};
        files[testFile] = function() {
            writeCount += 1;
        };
        files[snippetsDir] = function() {
            writeCount += 1;
        };

        const codeSyncSettings: settings.CodeSyncSettings = new settings.CodeSyncSettings(settingsFile, '');
        watcher = new file_watcher.FileWatcher(files, codeSyncSettings);

        // wait at least 3 seconds for writes to be noticed by file watcher before tests start
        setTimeout(function() {
            done();
        }, 3000);
    });

    setup(function() {
        // used to keep track of number of writes to file
        writeCount = 0;
    });

    suite('change', function() {
        test('Writing to test file should increment write count by 1', function(done) {
            this.timeout(5000);
            fs.appendFileSync(testFile, Buffer.from('testing'));
            setTimeout(function() {
                // stability threshold for file is 2 seconds so wait 3 seconds to ensure change event has come through
                assert.equal(writeCount, 1);
                done();
            }, 3000);
        });

        test('Writing to file in snippets directory should increment write count by 1', function(done) {
            this.timeout(5000);
            fs.appendFileSync(snippetsFile, Buffer.from('testing'));
            setTimeout(function() {
                // stability threshold for file is 2 seconds so wait 3 seconds to ensure change event has come through
                assert.equal(writeCount, 1);
                done();
            }, 3000);
        });
    });

    suiteTeardown(function() {
        watcher.shutdown();
        test_helpers.destroyTestingResources(testingResources);
    });
});
