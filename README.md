# Access the online application
[http://epiroc-front-end.s3-website-us-west-2.amazonaws.com/](http://epiroc-front-end.s3-website-us-west-2.amazonaws.com/)

# Build and run locally
### 1. Start the backend locally:
```shell
cd backend   # if not already
npm install  # if not already
npm start
```

### 2. Start the frontend locally:
```shell
cd frontend # if not already
npm install # if not already 
npm run dev
```
### 3. Then the application is accessible at `http://localhost:5173/`.

# Some assumptions
1. The power gauge is -700kW when charging and 180 * motorSpeed otherwise.
2. Motor RPM gague is 190 * motorSpeed.
3. Motor status indicator will light when RPM > 600.
4. Battery low indicator will light when battery percentage < 20.
5. When the charging starts, the motor will stop. When the motor starts, the charging will stop.
6. Higher motor speed will cause battery drain faster and temperature go up faster and to a higher target value.
7. The temperature range of the battery is between 10 and 15 * motorSpeed + 20.
8. The charging button is in orange color when charging is on, and in lime color when the percentage reaches 98.

# Access the database (readonly) via AWS console

1. Go to [https://stefj12.signin.aws.amazon.com/console](https://stefj12.signin.aws.amazon.com/console)<br>
IAM username: `dynamodb-readonly`<br>
Password: `bG5H%9%{`

2. Go to DynamoDB (can use the top search bar) <br>
     -> Tables <br>
     -> epiroc-task <br>
     -> Explore table items <br>
     -> "test" (under "Items returned")

# APIs
An API server is currently hosted online, so that values on the database can be viewed and updated.

To access the APIs, you can use `https://nt1dr4fuub.execute-api.us-west-2.amazonaws.com` in place of `BASE_URL` below.

## 1. Get all data

`GET BASE_URL/get-data`

## 2. Update the "parking brake" light

`POST BASE_URL/update-parking-brake`

body: `{"val": true}` to switch on; `{"val": false}` to switch off.


## 3. Update the "check engine" light

`POST BASE_URL/update-check-engine`

body: `{"val": true}` to switch on; `{"val": false}` to switch off.

## 4. Update the "gear ratio" text

`POST BASE_URL/update-gear-ratio`

body: `{"val": "your value"}`, max 10 chars.


