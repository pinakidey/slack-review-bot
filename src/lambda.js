const AWS = require('aws-sdk');
const comprehend = new AWS.Comprehend();

const SQS_REGION = "ap-northeast-1";
const SQS_QUEUE_URL = "https://sqs.ap-northeast-1.amazonaws.com/578752258577/NegativeReviews";
const sqs = new AWS.SQS({ region: SQS_REGION });

/**
 * Runs Amazon Comprehend Sentiment Analysis on each body object.
 * @param {Object} body
 */
const process = (body = {}) => {
    const params = {
        LanguageCode: "en",
        Text: body.text
    };

    comprehend.detectSentiment(params, function (err, data) {
        console.log(params);
        if (err) {
            console.log(err, err.stack);
        } else {
            console.log(data);
            if(data.Sentiment === "NEGATIVE") {
                console.log("Negative Review: ", body)
                sendToSQS({ "sentiment": data, "body": body })
            }
        }
    });
}

/**
 * Helper function for sending messages to SQS
 * @param {Object} event
 */
const sendToSQS = (event = {}) => {
    var params = {
        MessageBody: JSON.stringify(event),
        QueueUrl: SQS_QUEUE_URL
    };
    sqs.sendMessage(params, function (err, data) {
        console.log(params);
        if (err) {
            console.log('Error: Failed to Send Message. ', err);
        } else {
            console.log('Created Message Id: ', data.MessageId);
        }
    });
}

/**
 * Main lambda function that gets invoked whenever a new message arrives in the SQS queue it's associated with.
 * @param {Object} event
 * @param {Object} context
 * @description uses synchronous invocation to avoid need for a dead-letter-queue
 */
exports.handler = (event) => {
    event.Records.forEach(record => {
        const { body } = record;
        try {
            const parsedBody = typeof body === "string" ? JSON.parse(body) : body;
            // Process messages having English texts only
            if (parsedBody.text && parsedBody.lang === "en") {
                process(parsedBody);
            } else {
                console.log("Unsupported body: ", body);
            }
        } catch (error) {
            console.log("Parse error: ", error, body);
        }
    });
}


