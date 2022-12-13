import React from 'react';
import type {Node} from 'react';
// import {file} from 'url';
import {
  TouchableHighlight,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Alert,
  Image,
} from 'react-native';
import {BleManager, Device} from 'react-native-ble-plx';
import Dialog from 'react-native-dialog';
import {Buffer} from 'buffer';
import * as RNFS from 'react-native-fs';
// import {stravaAuth} from './stravaHandler';
import {authorize} from 'react-native-app-auth';
import DocumentPicker from 'react-native-document-picker';
import {MultiSelect} from 'react-native-element-dropdown';

// let gpsService;

const App: () => Node = () => {
  const [visible, setVisible] = React.useState(false);
  const [selected] = React.useState();
  let dropdownChoices = [];

  const RIDER_DEVICE_NAME = 'STATCYCLE';
  const CLOSE_DIR_UUID = 'c3b5d7db-997b-4207-87fb-84ac539d9fc2';
  const OPEN_DIR_UUID = '638637bd-5780-4140-8593-ad68ed54eec1';
  const LIST_DIR_UUID = '6094f1ba-8cf0-44bc-9b67-4ba8b30c42f3';
  const OPEN_FILE_UUID = '7d8d6c8b-dff7-4e4c-a67b-bcac8a945d5b';
  const READ_FILE_UUID = '4f204e4b-2ec6-427e-85b5-22430fc9626b';
  const XML_HEADER =
    '<?xml version="1.0" encoding="UTF-8"?><gpx creator="StatCycle Companion GPX Generator"><trk><name>StatCycle Ride</name><type>1</type><trkseg>';

  const client_id = '97923';
  const client_secret = '1cfcd9211804b7acce56123b4624364d263e62fd';
  const access_token = '53860b56618db38b9928d1cda59264deeccc384d';
  const config = {
    clientId: `${client_id}`,
    clientSecret: `${client_secret}`,
    redirectUrl: 'StatCycleApp://localhost',
    serviceConfiguration: {
      authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
      tokenEndpoint: `https://www.strava.com/oauth/token?client_id=${client_id}&client_secret=${client_secret}`,
    },
    scopes: ['activity:write'],
  };
  let activityName;

  const _BleManager = new BleManager();
  let driver = new Device();
  let gpsService;
  let pairingStatus = false;

  let filenameB64;
  let filenameUtf = '';
  let filenameHex;
  let truncatedHex;
  let truncatedB64;

  async function pairStatCycle() {
    console.log('Scan Beginning');
    _BleManager.startDeviceScan(
      null,
      {
        allowDuplicates: false,
      },
      async (error, device) => {
        // console.log(device.name);
        if (error) {
          console.log(error);
          Alert.alert('BLE ERROR. Try again.');
          _BleManager.stopDeviceScan();
        }
        if (device.name === RIDER_DEVICE_NAME) {
          console.log(device.name, 'has been selected as driver');
          driver = device;

          console.log('Searching for', driver.name, '...');

          const pairedDevice = await driver.connect();
          const pairingResult = await pairedDevice.isConnected();

          if (pairingResult) {
            console.log('pairing to', RIDER_DEVICE_NAME, 'success');
            pairingStatus = true;
            // Alert.alert('Pairing Successful.');

            const bleStack =
              await driver.discoverAllServicesAndCharacteristics();
            const allServices = await bleStack.services();
            // setService(allServices[0]);
            // console.log(gpsService);
            gpsService = allServices[0]; // Service item

            populateFileChoices();
            // gpsService = React.useRef(allServices[0]);

            // init file service
            // await gpsService.readCharacteristic(CLOSE_DIR_UUID);
            // await gpsService.readCharacteristic(OPEN_DIR_UUID);
          } else {
            console.log('sad');
            Alert.alert('Pairing Failed. Try again.');
          }
          _BleManager.stopDeviceScan();
        }
      },
    );
  }

  async function populateFileChoices() {
    if (!pairingStatus) {
      Alert.alert('Please connect to your StatCycle first!');
      return;
    }
    // const testService = Object.assign();
    // gpsService.clone();
    // console.log(testService);
    await gpsService.readCharacteristic(CLOSE_DIR_UUID);
    await gpsService.readCharacteristic(OPEN_DIR_UUID);

    // const txtEnding = '2e747874';
    // let i = 0;
    let temp;
    // dropdownChoices = [];
    while (true) {
      const listStatus = await gpsService.readCharacteristic(LIST_DIR_UUID);
      const listData = await listStatus.read();
      filenameB64 = listData.value;
      filenameUtf = Buffer.from(filenameB64, 'base64').toString('utf-8');
      filenameUtf = filenameUtf.substring(0, filenameUtf.indexOf('.txt') + 4);

      console.log('file found: ', filenameUtf);
      if (filenameUtf === temp) {
        console.log('ALL FILES LISTED');
        break;
      }
      if (filenameUtf.substring(0, 1) !== '.') {
        dropdownChoices.push({label: filenameUtf, value: filenameUtf});
      }
      temp = filenameUtf;
    }
    Alert.alert('Pairing successful!');
  }

  async function bleFileExport() {
    if (!pairingStatus) {
      Alert.alert('Please connect to your StatCycle first!');
      return;
    }

    console.log(
      'opening... ',
      Buffer.from(truncatedB64, 'base64').toString('utf8'),
    );
    await gpsService.writeCharacteristicWithoutResponse(
      OPEN_FILE_UUID,
      truncatedB64,
    );

    const gpxFilename =
      filenameUtf.substring(0, filenameUtf.indexOf('.txt')) + '.gpx';
    const localFilepath = RNFS.DocumentDirectoryPath + `/${gpxFilename}`;
    console.log('write filepath:', localFilepath);
    await RNFS.writeFile(localFilepath, XML_HEADER);

    while (true) {
      const fileCharResponse = await gpsService.readCharacteristic(
        READ_FILE_UUID,
      );

      const fileDataPacket = await fileCharResponse.read();
      const valB64 = fileDataPacket.value;
      const valStr = Buffer.from(valB64, 'base64').toString('utf-8');
      // console.log('B64 Data:', valB64);
      if (valStr.substring(0, 4) !== '2022') {
        break;
      }
      console.log('Str Data:', valStr);
      const GPX_trkpt = formTrkpt(valStr);
      await RNFS.appendFile(localFilepath, GPX_trkpt);
    }
    await RNFS.appendFile(localFilepath, '</trkseg></trk></gpx>');
    console.log('File Export Complete');
    Alert.alert('File Exported!');
  }

  function formTrkpt(rawString: String) {
    let outputString = '<trkpt ';
    const lat = rawString.substring(
      rawString.indexOf('Latitude') + 10,
      rawString.indexOf('Longitude') - 2,
    );
    const lon = rawString.substring(
      rawString.indexOf('Longitude') + 11,
      rawString.indexOf(', SPEED'),
    );
    outputString += `lat="${lat}" lon="${lon}">`;
    const timeISO = rawString.substring(0, 19) + 'Z';
    outputString += `<time>${timeISO}</time></trkpt>`;

    return outputString;
  }

  async function disconnectPress() {
    if (!pairingStatus) {
      Alert.alert('Not currently paired to any StatCycle.');
      return;
    }

    console.log(driver.name, 'disconnected');
    driver.cancelConnection();
  }

  async function POSTgpx() {
    setVisible(false);
    await waitforme(3000);

    console.log('The name of your strava activity is:', activityName);

    const file = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
    }).catch(err => {
      console.log(`Failed: ${err}`);
      return;
    });
    if (!file) {
      return;
    }

    console.log(file[0].uri);

    await fetch(
      `https://www.strava.com/oauth/deauthorize?access_token=${access_token}`,
      {
        method: 'POST',
      },
    );
    const auth = await authorize(config);
    const new_token = auth.accessToken;

    var formdata = new FormData();
    formdata.append('file', {
      uri: file[0].uri,
      name: file[0].name,
      type: file[0].type,
    });
    formdata.append('name', `${activityName}`);
    formdata.append(
      'description',
      'This Ride was uploaded via the ECE453 StatCycle, using the Strava V3 API.',
    );
    formdata.append('data_type', 'gpx');
    formdata.append('activity_type', 'Ride');

    fetch('https://www.strava.com/api/v3/uploads', {
      method: 'POST',
      body: formdata,
      headers: {
        Authorization: `Bearer ${new_token}`,
        'Content-Type': 'multipart/form-data',
      },
    })
      .then(response => response.text())
      .then(result => console.log(result));
    return;
  }

  function handleCancel() {
    setVisible(false);
  }

  function nameActivityHandler() {
    setVisible(true);
  }

  function chooseExport(item) {
    const txtEnding = '2e747874';

    // console.log('function:', item);
    filenameUtf = item[0];
    console.log('chosen filename:', filenameUtf);
    filenameHex = Buffer.from(filenameUtf, 'utf-8').toString('hex');
    const EOFindex = filenameHex.indexOf(txtEnding) + txtEnding.length;
    truncatedHex = filenameHex.substring(0, EOFindex);
    truncatedB64 = Buffer.from(truncatedHex, 'hex').toString('base64');

    Alert.alert('File Selected.');
  }

  function waitforme(milisec) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('');
      }, milisec);
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Stat Cycle Companion</Text>
      </View>
      <Image
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          width: 200,
          height: 150,
          align: 'center',
          position: 'absolute',
          top: 100,
        }}
        source={require('./bike_clipart.png')}
      />

      <View style={styles.buttonContainer}>
        <Dialog.Container visible={visible}>
          <Dialog.Title>Enter the name of your Strava Activity</Dialog.Title>
          <Dialog.Input
            onChangeText={input => {
              activityName = input;
            }}
          />
          <Dialog.Button label="Cancel" onPress={handleCancel} />
          <Dialog.Button label="Save" onPress={POSTgpx} />
        </Dialog.Container>

        <TouchableHighlight style={styles.button} onPress={pairStatCycle}>
          <Text style={styles.buttonText}>Scan and Connect to StatCycle</Text>
        </TouchableHighlight>

        {/* <TouchableHighlight style={styles.button} onPress={bleFileSelector}>
          <Text style={styles.buttonText}>Select GPX File</Text>
        </TouchableHighlight> */}

        {/* <TouchableHighlight style={styles.button} onPress={populateFileChoices}>
          <Text style={styles.buttonText}>Populate File Choices</Text>
        </TouchableHighlight> */}

        <TouchableHighlight style={styles.button} onPress={bleFileExport}>
          <Text style={styles.buttonText}>Export GPX File</Text>
        </TouchableHighlight>

        <TouchableHighlight style={styles.button} onPress={nameActivityHandler}>
          <Text style={styles.buttonText}>Post Ride to Strava</Text>
        </TouchableHighlight>

        <TouchableHighlight style={styles.button} onPress={disconnectPress}>
          <Text style={styles.buttonText}>Disconnect from StatCycle</Text>
        </TouchableHighlight>
        {/* <TouchableHighlight style={styles.button} onPress={GPSCHECK}>
          <Text style={styles.buttonText}>wee woo</Text>
        </TouchableHighlight> */}

        <MultiSelect
          style={styles.dropdown}
          data={dropdownChoices}
          labelField="label"
          valueField="value"
          value={selected}
          onChange={item => {
            chooseExport(item);
          }}
          placeholder="Select Data File"
          visibleSelectedItem={false}
          renderSelectedItem={true}
        />
      </View>

      <Image
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          width: 350,
          height: 95,
          align: 'center',
          position: 'absolute',
          bottom: 120,
        }}
        source={require('./UW_Eng.png')}
      />
      <Image
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          width: 350,
          height: 85,
          align: 'center',
          position: 'absolute',
          bottom: 25,
        }}
        source={require('./Plexus_Logo.png')}
      />

      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  dropdown: {
    margin: 16,
    height: 50,
    width: 300,
    // position: 'absolute',
    // top: 300,
    backgroundColor: '#EEEEEE',
    borderRadius: 22,
    paddingHorizontal: 8,
  },

  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleContainer: {
    position: 'absolute',
    top: 50,
    align: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  buttonContainer: {
    align: 'center',
    position: 'absolute',
  },
  button: {
    margin: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    backgroundColor: '#0D7C87',
  },
  buttonText: {
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
});

export default App;
