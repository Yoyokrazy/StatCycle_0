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

const App: () => Node = () => {
  const [visible, setVisible] = React.useState(false);

  const RIDER_DEVICE_NAME = 'STATCYCLE';
  const CLOSE_DIR_UUID = 'c3b5d7db-997b-4207-87fb-84ac539d9fc2';
  const OPEN_DIR_UUID = '638637bd-5780-4140-8593-ad68ed54eec1';
  const LIST_DIR_UUID = '6094f1ba-8cf0-44bc-9b67-4ba8b30c42f3';
  const OPEN_FILE_UUID = '7d8d6c8b-dff7-4e4c-a67b-bcac8a945d5b';
  const READ_FILE_UUID = '4f204e4b-2ec6-427e-85b5-22430fc9626b';

  const dateObj = new Date();
  const currDay = dateObj.getDate();
  const currMonth = dateObj.getMonth() + 1;
  const currYear = dateObj.getFullYear();
  // const GPXfilename = `StatCycle_GPX_${currYear}_${currMonth}_${currDay}.gpx`;
  const GPXfilename = `StatCycle_GPX_${currYear}_${currMonth}_${currDay}.gpx`;
  const XML_HEADER =
    '<?xml version="1.0" encoding="UTF-8"?><gpx creator="StatCycle Companion GPX Generator"><trk><name>StatCycle Ride</name><type>1</type><trkseg>';

  const _BleManager = new BleManager();
  let driver = new Device();
  let gpsService;
  let pairingStatus = false;

  // function checkPairing() {
  //   return 1;
  // }

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
            Alert.alert('Pairing Successful.');

            const bleStack =
              await driver.discoverAllServicesAndCharacteristics();
            const allServices = await bleStack.services();
            gpsService = allServices[0]; // Service item

            // init file service
            await gpsService.readCharacteristic(CLOSE_DIR_UUID);
            await gpsService.readCharacteristic(OPEN_DIR_UUID);
          } else {
            console.log('sad');
            Alert.alert('Pairing Failed. Try again.');
          }
          _BleManager.stopDeviceScan();
        }
      },
    );
  }

  let filenameB64;
  let filenameUtf = '';
  let filenameHex;
  let truncatedHex;
  let truncatedB64;
  async function bleFileSelector() {
    if (!pairingStatus) {
      Alert.alert('Please connect to your StatCycle first!');
      return;
    }

    const txtEnding = '2e747874';

    const listStatus = await gpsService.readCharacteristic(LIST_DIR_UUID);
    const listData = await listStatus.read();
    filenameB64 = listData.value;
    const tempName = filenameUtf;
    filenameUtf = Buffer.from(filenameB64, 'base64').toString('utf-8');
    if (filenameUtf.substring(0, 1) === '.') {
      if (tempName === '') {
        Alert.alert('There are no files stored on your Device.');
      } else {
        Alert.alert('There are no more files stored on your Device.');
      }
      return;
    }

    filenameHex = Buffer.from(filenameB64, 'base64').toString('hex');
    const EOFindex = filenameHex.indexOf(txtEnding) + txtEnding.length;
    truncatedHex = filenameHex.substring(0, EOFindex);
    truncatedB64 = Buffer.from(truncatedHex, 'hex').toString('base64');

    console.log('Selected File:');
    console.log('str path:    ', filenameUtf);
    console.log('truncatedHex:', truncatedHex);

    Alert.alert('File Selected:', filenameUtf);
  }

  async function fileNameDialog() {
    setVisible(true);
  }

  let userFilename;
  async function bleFileExport() {
    setVisible(false);
    console.log('USER FILENAME:', userFilename);
    if (!pairingStatus) {
      Alert.alert('Please connect to your StatCycle first!');
      return;
    }

    await gpsService.writeCharacteristicWithoutResponse(
      OPEN_FILE_UUID,
      truncatedB64,
    );

    const localFilepath = RNFS.DocumentDirectoryPath + `/${userFilename}`;
    await RNFS.writeFile(localFilepath, XML_HEADER);

    // for (let i = 0; i < 500; i++) {
    for (let i = 0; i < 1000; i++) {
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
      // await waitforme(300);
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

  function waitforme(milisec) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('');
      }, milisec);
    });
  }

  const client_id = '97923';
  const client_secret = '1cfcd9211804b7acce56123b4624364d263e62fd';

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

  async function POSTgpx() {
    const file = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
    });

    console.log(file[0].uri);
    const auth = await authorize(config);
    const new_token = auth.accessToken;

    var formdata = new FormData();
    formdata.append('file', {
      uri: file[0].uri,
      name: file[0].name,
      type: file[0].type,
    });
    formdata.append('name', 'StatCycle_API_Mobile0');
    formdata.append('description', 'Formdata please');
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

  // function handleSave() {
  //   setVisible(false);
  // }

  // function handleFilename(input) {
  //   userFilename = input;
  // }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Stat Cycle Companion</Text>
      </View>
      <Image
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          width: 350,
          height: 95,
          align: 'center',
          position: 'absolute',
          top: 160,
        }}
        source={require('./UW_Eng.png')}
      />

      <View style={styles.buttonContainer}>
        <Dialog.Container visible={visible}>
          <Dialog.Title>
            Please enter your desired GPX file name below. (must end in '.gpx')
          </Dialog.Title>
          <Dialog.Input
            onChangeText={filename => {
              userFilename = filename;
            }}>
            {GPXfilename}
          </Dialog.Input>
          <Dialog.Button label="Cancel" onPress={handleCancel} />
          <Dialog.Button label="Save" onPress={bleFileExport} />
        </Dialog.Container>
        <TouchableHighlight style={styles.button} onPress={pairStatCycle}>
          <Text style={styles.buttonText}>Scan and Connect to StatCycle</Text>
        </TouchableHighlight>

        <TouchableHighlight style={styles.button} onPress={bleFileSelector}>
          <Text style={styles.buttonText}>Select GPX File</Text>
        </TouchableHighlight>

        <TouchableHighlight style={styles.button} onPress={fileNameDialog}>
          <Text style={styles.buttonText}>Export GPX File</Text>
        </TouchableHighlight>

        <TouchableHighlight style={styles.button} onPress={POSTgpx}>
          <Text style={styles.buttonText}>Post Ride to Strava</Text>
        </TouchableHighlight>

        <TouchableHighlight style={styles.button} onPress={disconnectPress}>
          <Text style={styles.buttonText}>Disconnect from StatCycle</Text>
        </TouchableHighlight>
      </View>
      <Image
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          width: 200,
          height: 150,
          align: 'center',
          position: 'absolute',
          bottom: 125,
        }}
        source={require('./bike_clipart.png')}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleContainer: {
    position: 'absolute',
    top: 100,
    align: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  buttonContainer: {
    align: 'center',
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
