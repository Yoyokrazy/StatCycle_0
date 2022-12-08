import React from 'react';
import type {Node, useState} from 'react';
import {
  TouchableHighlight,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import {BleManager, Device} from 'react-native-ble-plx';
import {Buffer} from 'buffer';
// import { fileInitGPX } from './gpxHandler';
import * as RNFS from 'react-native-fs';
import {write} from 'fs';

const App: () => Node = () => {
  const RIDER_DEVICE_NAME = 'STATCYCLE';
  const _BleManager = new BleManager();
  let driver = new Device();

  async function pairStatCycle() {
    console.log('Scan Beginning');
    _BleManager.startDeviceScan(
      null,
      {
        allowDuplicates: false,
      },
      async (error, device) => {
        console.log(device.name);
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
            Alert.alert('Pairing Successful.');
          } else {
            console.log('sad');
            Alert.alert('Pairing Failed. Try again.');
          }
          _BleManager.stopDeviceScan();
        }
      },
    );
  }

  async function listServices() {
    const idk = await driver.discoverAllServicesAndCharacteristics();
    const allServices = await idk.services();

    allServices.forEach(svc => {
      const characteristicPromise = svc.characteristics();
      characteristicPromise.then(charArray => {
        charArray.forEach(char => {
          const dataPromise = char.read();
          dataPromise.then(data => {
            console.log('characteristic UUID:', char.uuid);
            // console.log("id: ", data.id);
            // console.log("serviceID: ", data.serviceID);
            console.log(
              'value: ',
              Buffer.from(data.value, 'base64').toString('hex'),
            );
          });
        });
      });
    });
  }

  async function disconnectPress() {
    console.log(driver.name, 'disconnected');
    driver.cancelConnection();
  }

  function debugTester() {
    console.log('debug 0');
    console.log('debug 1');
    console.log('debug 2');
  }

  const path = RNFS.DocumentDirectoryPath + '/statCycleGPX.txt';
  // const gpxDir = RNFS.cacheDirectory + 'statCycleGPX/';

  const [content, setContent] = React.useState(null);
  const writeFile = () => {
    console.log(path);
    RNFS.writeFile(path, 'This is a content from Waldo', 'utf8')
      .then(() => console.log('FILE WRITTEN!'))
      .catch(err => console.log(err.message));
  };
  const readFile = () => {
    RNFS.readDir(RNFS.DocumentDirectoryPath)
      .then(result => {
        console.log('GOT RESULT', result);
        return Promise.all([RNFS.stat(result[0].path), result[0].path]);
      })
      .then(statResult => {
        if (statResult[0].isFile()) {
          return RNFS.readFile(statResult[1], 'utf8');
        }
        return 'no file';
      })
      .then(contents => {
        setContent(contents);
        console.log(contents);
      })
      .catch(err => {
        console.log(err.message, err.code);
      });
  };
  const deleteFile = () => {
    var path = RNFS.DocumentDirectoryPath + '/test.txt';
    return RNFS.unlink(path)
      .then(() => {
        console.log('FILE DELETED');
        setContent(null);
      })
      .catch(err => {
        console.log(err.message);
      });
  };

  function fileInitGPX() {}

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Stat Cycle Companion</Text>
      </View>

      <View style={styles.buttonContainer}>
        {/* // TODO: byte transmission of XML GPS data */}
        <TouchableHighlight style={styles.button} onPress={pairStatCycle}>
          <Text style={styles.buttonText}>Scan and Connect to StatCycle</Text>
        </TouchableHighlight>
        <TouchableHighlight style={styles.button} onPress={disconnectPress}>
          <Text style={styles.buttonText}>Disconnect from StatCycle</Text>
        </TouchableHighlight>
        <TouchableHighlight style={styles.button} onPress={listServices}>
          <Text style={styles.buttonText}>List Services</Text>
        </TouchableHighlight>
        {/* // TODO: write to file system on phone */}
        <TouchableHighlight style={styles.button} onPress={writeFile}>
          <Text style={styles.buttonText}>XML Tester</Text>
        </TouchableHighlight>
        <TouchableHighlight style={styles.button} onPress={debugTester}>
          <Text style={styles.buttonText}>Debug Tester</Text>
        </TouchableHighlight>
      </View>

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
    top: 70,
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
