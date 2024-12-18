import { useState, useEffect, useCallback } from 'react';
import ReactSpeedometer from "react-d3-speedometer";
import axios from 'axios';
import { ClipLoader } from 'react-spinners';
import './App.css';
import BrakeOn from './assets/brake-on.png';
import BrakeOff from './assets/brake-off.png';
import CheckEngineOn from './assets/check-engine-on.png';
import CheckEngineOff from './assets/check-engine-off.png';
import MotorStatusOn from './assets/motor-status-on.png';
import MotorStatusOff from './assets/motor-status-off.png';
import BatteryPercentageOn from './assets/battery-percentage-on.png';
import BatteryPercentageOff from './assets/battery-percentage-off.png';
import Ratio from './assets/ratio.png';
import BatteryPercentage from './assets/battery-percentage.png';
import BatteryTemperature from './assets/battery-temperature.png';
import Rpm from './assets/rpm.png';
import Menu from './assets/menu.png';
import ChargingGrey from './assets/charging-grey.png';
import ChargingOrange from './assets/charging-orange.png';
import ChargingLime from './assets/charging-lime.png';

const BASE_URL = "http://localhost:3000";

function App() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch all data
  const getData = useCallback(() => {
    axios.get(`${BASE_URL}/get-data`)
      .then(response => {
        setData(response.data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, []);

  // Called when toggling the speed slider
  const updateMotorSpeed = useCallback((motorSpeed) => {
    if (loading) { return; }
    setLoading(true);
    axios.post(`${BASE_URL}/update-motor-speed`, { motorSpeed })
      .then(response => {
        setLoading(false);
        setData({ ...data, ...response.data.updatedAttributes });
      })
      .catch(error => {
        setLoading(false);
        console.error("Error updating motor speed.", error);
      });
  }, [data, loading]);

  // Called when clicking the charging button
  const updateCharging = useCallback(() => {
    if (loading) { return; }
    setLoading(true);
    axios.post(`${BASE_URL}/update-charging`, { charging: !data.charging })
      .then(response => {
        setLoading(false);
        setData({ ...data, ...response.data.updatedAttributes });
      })
      .catch(error => {
        setLoading(false);
        console.error("Error updating charging.", error);
      });
  }, [data, loading]);

  const ChargingIcon = () => {
    switch (data.chargingColor) {
      case "lime":
        return ChargingLime;
      case "orange":
        return ChargingOrange;
      default:
        return ChargingGrey;
    }
  };

  // periodic fetch of data
  useEffect(() => {
    getData();
    const interval = setInterval(() => {
      getData();
    }, 3000);

    return () => clearInterval(interval);
  }, [getData]);

  return (
    <div className="dashboard">

      {/* data loading spinner */}
      {loading &&
        <div className='spinner'>
          <ClipLoader color="grey" loading={loading} size={50} />
        </div>
      }

      {/* first row icons */}
      <div className="top-icons">
        <img src={data.parkingBrake ? BrakeOn : BrakeOff} alt="Parking Brake Icon" />
        <img src={data.checkEngine ? CheckEngineOn : CheckEngineOff} alt="Check Engine Icon" />
        <img src={data.rpmHigh ? MotorStatusOn : MotorStatusOff} alt="Motor Status Icon" />
        <img src={data.batteryLow ? BatteryPercentageOn : BatteryPercentageOff} alt="Battery Percentage Icon" />
      </div>

      {/* second row (gauges) */}
      <div className="meters">
        <div className="meter">
          <ReactSpeedometer
            height={230}
            width={320}
            minValue={-1000}
            maxValue={1000}
            segments={8}
            needleColor='#CCCCCC'
            ringWidth={90}
            segmentColors={["#555555"]}
            currentValueText="${value} kW"
            value={data?.kw ?? 0}
            valueTextFontSize="24"
            paddingVertical={40}
          />
        </div>
        <div className="meter">
          <ReactSpeedometer
            height={230}
            width={320}
            minValue={0}
            maxValue={800}
            segments={8}
            needleColor='#CCCCCC'
            ringWidth={90}
            segmentColors={["#555555"]}
            currentValueText="${value} RPM"
            value={data?.rpm ?? 0}
            valueTextFontSize="24"
            paddingVertical={40}
          />
        </div>
      </div>

      {/* third row icons and the speed setting */}
      <div className="bottom-controls">
        <div className="section">
          <img src={Ratio} alt="Gear Ratio Icon" />
          <span>{data.gearRatio}</span>
        </div>
        <div className="section">
          <img src={BatteryPercentage} alt="Battery Percentage Icon" />
          <span>{data?.batteryPercentage?.toFixed(0) ?? 0} %</span>
        </div>
        <div className="section">
          <img src={BatteryTemperature} alt="Battery Temperature Icon" />
          <span>{data?.batteryTemperature?.toFixed(0) ?? 0} °C</span>
        </div>
        <div className="section">
          <img src={Rpm} alt="RPM Icon" />
          <span>{data?.rpm?.toFixed(0) ?? 0} RPM</span>
        </div>
        <div className="section speed-controller">
          <span>MOTOR SPEED SETTING</span>
          <input style={{ cursor: "pointer" }} type="range" min="0" max="4" step="1" value={data.motorSpeed ?? 0} onChange={e => updateMotorSpeed(Number(e.target.value))} />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            marginTop: '5px'
          }}>
            <span style={{ marginLeft: -10 }}>OFF</span>
            <span style={{ marginLeft: -12 }}>1</span>
            <span style={{ marginLeft: -5 }}>2</span>
            <span style={{ marginLeft: -2 }}>3</span>
            <span style={{ marginLeft: -2 }}>4</span>
          </div>
        </div>
      </div>

      {/* fourth row icons and charging button */}
      <div className="bottom-controls"  >
        <div className="section-small">
          <img src={Ratio} alt="Gear Ratio Icon" />
        </div>
        <div className="section-small">
          <img src={Rpm} alt="RPM Icon" />
        </div>
        <div className="section-small">
          <img src={BatteryTemperature} alt="Battery Temperature Icon" />
        </div>
        <div className="section-small" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <img src={Menu} alt="Menu Icon" style={{ width: 100, height: 100 }} />
        </div>
        <div className="section-small" style={{ position: 'absolute', right: '2%' }}>
          <img src={ChargingIcon()} alt="Charging Button" onClick={updateCharging} style={{ cursor: 'pointer' }} />
        </div>
      </div>
    </div>
  );
}

export default App;
