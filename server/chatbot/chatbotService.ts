import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ChatbotService {
    static callPythonChatbot(question: string, personalityType?: string) {
        return new Promise((resolve, reject) => {
            // Path to the Python API wrapper
            const pythonScriptPath = path.join(__dirname, '..', '..', 'ai-backend', 'api', 'chatbot_api.py');

            // Set working directory to the ai-backend directory so Python can find relative paths
            const workingDirectory = path.join(__dirname, '..', '..', 'ai-backend');

            console.log(`Calling Python script: ${pythonScriptPath}`);
            console.log(`Working directory: ${workingDirectory}`);

            // Prepare the question with personality context if provided
            let contextualQuestion = question;
            if (personalityType && personalityType !== 'chatbot' && personalityType !== 'unknown') {
                contextualQuestion = `I am a ${personalityType.toUpperCase()} personality type. ${question}`;
            }

            console.log(`Question to send: ${contextualQuestion}`);

            // Spawn Python process with correct working directory
            const pythonProcess = spawn('python3', [pythonScriptPath, contextualQuestion], {
                cwd: workingDirectory,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let dataString = '';
            let errorString = '';

            pythonProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorString += data.toString();
                // Log debug output for troubleshooting
                const errorLine = data.toString().trim();
                if (errorLine.startsWith('DEBUG:')) {
                    console.log('Python Debug:', errorLine);
                } else {
                    console.error('Python STDERR:', errorLine);
                }
            });

            pythonProcess.on('close', (code) => {
                console.log(`Python process exited with code ${code}`);
                console.log(`Raw Python output: ${dataString}`);

                if (code !== 0) {
                    console.error(`Python process exited with code ${code}`);
                    if (errorString) {
                        console.error('Python errors:', errorString);
                    }
                    reject(new Error(`Python process exited with code ${code}: ${errorString}`));
                    return;
                }

                try {
                    // Clean the output - remove any extra whitespace or debug output
                    const cleanOutput = dataString.trim();
                    if (!cleanOutput) {
                        reject(new Error('No output from Python script'));
                        return;
                    }

                    const result = JSON.parse(cleanOutput);
                    console.log('Parsed Python response:', result);
                    resolve(result);
                } catch (parseError: any) {
                    console.error('Failed to parse Python response:', dataString);
                    console.error('Parse error:', parseError.message);
                    reject(new Error(`Failed to parse Python response: ${parseError.message}`));
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });

            // Set a timeout to prevent hanging
            setTimeout(() => {
                console.log('Python process timeout - killing process');
                pythonProcess.kill();
                reject(new Error('Python process timeout after 30 seconds'));
            }, 30000);
        });
    }

    static async askQuestion(question: string, personalityType?: string) {
        return await this.callPythonChatbot(question, personalityType);
    }

    static async checkStatus() {
        return await this.callPythonChatbot('test');
    }
}