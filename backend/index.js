const express = require('express');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });
const TABLE_NAME = 'epiroc-task';
const ITEM_ID = 'test';

const OK = 'ok';
const DELAY = 500;

const PERCENTAGE_MIN = 0;
const PERCENTAGE_MAX = 100;
const TEMPERATURE_MIN = 10;
const KW_CHARGING = -700;
const KW_ON = (speed) => speed * 180;
const RPM = (speed) => speed * 190;

const BATTERY_LOW_THRESHOLD = 20;
const BATTERY_FULL_THRESHOLD = 98;
const RPM_HIGH_THRESHOLD = 600;

// Every 10 sec, check charging status then adjust
// battery_percentage and battery_temperature accordingly. 
// Stop motor if battery used up.
cron.schedule('*/10 * * * * *', async () => {
    console.log('Checking charging status', new Date());
    const result = await getData();
    if (result.status !== OK) {
        console.log("Get data error " + result.data);
        return;
    }

    // Update battery data
    // Charging: increase percentage
    // Motor on: decrease percentage (faster if motor speed higher). Temperature higher if motor speed higher.
    // Neither: decrease temperature 
    let { batteryPercentage, batteryTemperature, motorSpeed, charging, kw, rpm } = result.data;
    if (charging && motorSpeed > 0) {
        console.log("Error: charging while motor on");
        return;
    }
    if (charging || motorSpeed > 0) {
        batteryPercentage = charging ? batteryPercentage + 10 : batteryPercentage - 0.5 * motorSpeed;
        batteryPercentage = Math.max(PERCENTAGE_MIN, Math.min(PERCENTAGE_MAX, batteryPercentage));
    }
    if (!charging) {
        const targetTemperature = motorSpeed > 0 ? motorSpeed * 15 + 20 : TEMPERATURE_MIN;
        batteryTemperature += (targetTemperature - batteryTemperature) * 0.2;
    }

    // stop motor if battery used up
    if (batteryPercentage < 1) {
        motorSpeed = 0;
        kw = 0;
        rpm = 0;
    }

    const params = {
        TableName: TABLE_NAME,
        Key: { id: ITEM_ID },
        UpdateExpression: 'set batteryPercentage = :batteryPercentage, batteryTemperature = :batteryTemperature, motorSpeed = :motorSpeed, kw = :kw, rpm = :rpm',
        ExpressionAttributeValues: {
            ':batteryPercentage': batteryPercentage,
            ':batteryTemperature': batteryTemperature,
            ':motorSpeed': motorSpeed,
            ':kw': kw,
            ':rpm': rpm,
        },
        ReturnValues: 'UPDATED_NEW',
    };
    try {
        const returnValue = await dynamoDB.update(params).promise();
        console.log("Battery update success " + JSON.stringify(returnValue.Attributes));
    } catch (error) {
        console.log("Battery update error " + error.message);
    }
});

// status data that is not in DB
const extraStatus = (dbData) => {
    return {
        batteryLow: dbData.batteryPercentage < BATTERY_LOW_THRESHOLD,
        rpmHigh: dbData.rpm > RPM_HIGH_THRESHOLD,
        chargingColor: dbData.charging ? (dbData.batteryPercentage >= BATTERY_FULL_THRESHOLD ? 'lime' : 'orange') : 'grey',
    };
};

// util function to get all data from DB
const getData = async () => {
    const params = {
        TableName: TABLE_NAME,
        Key: { id: ITEM_ID },
    };
    try {
        let data = (await dynamoDB.get(params).promise()).Item;
        data = {
            ...data,
            ...extraStatus(data),
        };
        return { status: OK, data }
    } catch (error) {
        return { status: 'err', data: error.message };
    }
}

// get-data API
app.get('/get-data', async (req, res) => {
    const result = await getData();
    if (result.status === 'ok') {
        res.json(result.data);
    } else {
        res.status(500).json({ error: result.data });
    }
});

// update-charging API
app.post('/update-charging', async (req, res) => {
    const { charging } = req.body;
    const params = {
        TableName: TABLE_NAME,
        Key: { id: ITEM_ID },
        UpdateExpression: 'set charging = :charging',
        ExpressionAttributeValues: { ':charging': charging },
        ReturnValues: 'ALL_NEW',
    };

    // set rpm=0, motorSpeed=0, kw=KW_CHARGING when charging starts
    if (charging === true) {
        params.UpdateExpression += ', rpm = :rpm, motorSpeed = :motorSpeed, kw = :kw';
        params.ExpressionAttributeValues[':rpm'] = 0;
        params.ExpressionAttributeValues[':motorSpeed'] = 0;
        params.ExpressionAttributeValues[':kw'] = KW_CHARGING;

    } else {
        params.UpdateExpression += ', kw = :kw';
        params.ExpressionAttributeValues[':kw'] = 0;
    }

    try {
        const result = await dynamoDB.update(params).promise();
        setTimeout(() => {
            res.json({ updatedAttributes: { ...result.Attributes, ...extraStatus(result.Attributes) } });
        }, DELAY);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// update-motor-speed API
app.post('/update-motor-speed', async (req, res) => {
    const { motorSpeed } = req.body;
    const params = {
        TableName: TABLE_NAME,
        Key: { id: ITEM_ID },
        UpdateExpression: 'set motorSpeed = :motorSpeed, kw = :kw, rpm = :rpm, charging = :charging',
        ExpressionAttributeValues: {
            ':motorSpeed': motorSpeed,
            ':kw': KW_ON(motorSpeed),
            ':rpm': RPM(motorSpeed),
            ':charging': false
        },
        ReturnValues: 'ALL_NEW',
    };
    try {
        const result = await dynamoDB.update(params).promise();
        setTimeout(() => {
            res.json({ updatedAttributes: { ...result.Attributes, ...extraStatus(result.Attributes) } });
        }, DELAY);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
