// This simulates a small, on-device classification model.
import * as tf from '@tensorflow/tfjs';

let simulatedModel;

async function loadSimulatedModel() {
    if (simulatedModel) {
        return simulatedModel;
    }

    // Define simple weights and biases for a "model" that classifies based on some numerical features
    // For demonstration, let's say we have 3 input features (e.g., hasID, hasText, isButtonTag)
    // and 3 output classes (e.g., 'input', 'button', 'link').
    // These weights are completely arbitrary for demonstration.
    const weights = tf.tensor2d([
        [0.8, 0.1, 0.1],  // Input 1 -> [Input, Button, Link]
        [0.2, 0.7, 0.1],  // Input 2 -> [Input, Button, Link]
        [0.1, 0.1, 0.9]   // Input 3 -> [Input, Button, Link]
    ]);
    const biases = tf.tensor1d([-0.5, -0.5, -0.5]);

    simulatedModel = {
        predict: (inputTensor) => {
            // Simple linear transformation: input * weights + biases
            return inputTensor.matMul(weights).add(biases).softmax(); // Apply softmax for probabilities
        }
    };

    console.log("Simulated TF.js model loaded.");
    return simulatedModel;
}

/**
 * Preprocesses elementInfo into a numerical tensor suitable for the simulated model.
 * This is where you would convert DOM attributes into numerical features.
 * This example is highly simplified.
 * @param {object} elementInfo
 * @returns {tf.Tensor}
 */
function preprocessElement(elementInfo) {
    // Example features:
    // 1. Is it an input tag? (0 or 1)
    // 2. Does it have significant text content? (0 or 1)
    // 3. Is it a button tag or role="button"? (0 or 1)
    const features = [
        elementInfo.tagName === 'input' || elementInfo.tagName === 'textarea' || elementInfo.tagName === 'select' ? 1 : 0,
        elementInfo.textContent.length > 5 || elementInfo.ariaLabel ? 1 : 0,
        elementInfo.tagName === 'button' || elementInfo.type === 'submit' || elementInfo.role === 'button' ? 1 : 0
    ];
    return tf.tensor2d([features]); // Reshape to [1, num_features] for prediction
}

/**
 * Post-processes the model's prediction tensor into a human-readable classification.
 * @param {tf.Tensor} predictionTensor
 * @returns {object} { type: string, confidence: number }
 */
function postprocessPrediction(predictionTensor) {
    const classLabels = ['inputField', 'button', 'link']; // Map output index to class label
    const data = predictionTensor.dataSync(); // Get the probabilities as a JS array
    const maxIndex = data.indexOf(Math.max(...data));
    const type = classLabels[maxIndex] || 'element';
    const confidence = data[maxIndex];

    return { type, confidence };
}


/**
 * Classifies an HTML element using the simulated TensorFlow.js model.
 * This function will be called from content.js.
 * @param {object} elementInfo
 * @returns {Promise<object>}
 */
export async function classifyElement(elementInfo) {
    console.log("Classifying element with TF.js simulator...");
    const model = await loadSimulatedModel();
    const inputTensor = preprocessElement(elementInfo);
    const predictionTensor = model.predict(inputTensor); // Perform inference
    const result = postprocessPrediction(predictionTensor);

    // Dispose tensors to free up GPU memory (important for performance)
    inputTensor.dispose();
    predictionTensor.dispose();

    console.log(`TF.js Classification Result: ${result.type} with confidence ${result.confidence.toFixed(2)}`);
    return result;
}