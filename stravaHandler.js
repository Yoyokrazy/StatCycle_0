import {authorize} from 'react-native-app-auth';
// import DocumentPicker from 'react-native-document-picker';
import * as RNFS from 'react-native-fs';

const client_id = '97923';
const client_secret = '1cfcd9211804b7acce56123b4624364d263e62fd';
// const access_token = '53860b56618db38b9928d1cda59264deeccc384d';
// const redirect_URL = 'StatCycleApp://localhost';

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
// function uploadThing(token, path) {
//   fetch('https://www.strava.com/api/v3/uploads', {
//     method: 'POST',
//     body: {
//       file: `@file://${path}`,
//       name: 'StatCycle_API_Mobile0',
//       description:
//         'this time using the iOS app (not Swagger) -- Planet_Trek file',
//       data_type: 'gpx',
//       activity_type: 'Ride',
//     },
//     headers: {
//       Authorization: `Bearer ${token}`,
//       // 'Content-Type': 'application/gpx+xml',
//       'Content-Type': 'multipart/form-data',
//     },
//   }).then(POSTresponse => {
//     console.log(POSTresponse);
//   });
// }

export async function stravaAuth() {
  // await fetch(
  //   `https://www.strava.com/oauth/deauthorize?access_token=${access_token}`,
  //   {
  //     method: 'POST',
  //   },
  // );

  const auth = await authorize(config);
  const new_token = auth.accessToken;

  const path =
    RNFS.DocumentDirectoryPath + '/StatCycle_GPX_2022_12_12_TEST3.gpx';
  console.log(path);

  var formdata = new FormData();
  // formdata.append('file', `@${path}`, 'StatCycle_GPX_2022_12_12_TEST3.gpx');
  formdata.append(
    'file',
    RNFS.DocumentDirectoryPath,
    '/StatCycle_GPX_2022_12_12_TEST3.gpx',
  );
  // formdata.append('file', `@${path}`);
  formdata.append('name', 'StatCycle_API_Mobile0');
  formdata.append('description', 'Formdata please');
  formdata.append('data_type', 'gpx');

  fetch('https://www.strava.com/api/v3/uploads', {
    method: 'POST',
    body: formdata,
    // body: {
    //   file: `"@${path}"`,
    //   name: 'StatCycle_API_Mobile0',
    //   description: 'this time using the iOS app (not Swagger) -- test file',
    //   data_type: 'gpx',
    //   activity_type: 'Ride',
    // },
    headers: {
      Authorization: `Bearer ${new_token}`,
      'Content-Type': 'multipart/form-data',
    },
  })
    .then(response => response.text())
    .then(result => console.log(result));

  // RNFS.readDir(RNFS.DocumentDirectoryPath)
  //   .then(result => {
  //     // console.log('GOT RESULT', result);
  //     // console.log(result[0].path);
  //     return Promise.all([RNFS.stat(result[0].path), result[0].path]);
  //   })
  //   .then(statResult => {
  //     if (statResult[0].isFile()) {
  //       // gpxPath = statResult[0].path;
  //       // console.log('orignal path var:', statResult[0].);

  //       const myURI = 'file://' + statResult[0].path;
  //       // const myURI =  statResult[0].path;
  // const myName =
  //   'Planet_Trek_Is_This_It_Flavor_InnerSpeaker_Call_Me_If_You_Get_Lost.gpx';
  // const gpxMIME = 'application/gpx+xml';
  // const myFile = {
  //   uri: myURI, // e.g. 'file:///path/to/file/image123.jpg'
  //   name: myName, // e.g. 'image123.jpg',
  //   type: gpxMIME, // e.g. 'image/jpg'
  // };

  // const data = new FormData();
  // data.append('file', myFile);
  // // for (const val of data.values()) {
  // //   console.log(val);
  // // }

  // // the @ symbol is likely necessary here in front of this path
  // console.log('fetch path:', `@${statResult[0].path}`);

  // // uploadThing(new_token, statResult[0].path);
  // fetch('https://www.strava.com/api/v3/uploads', {
  //   method: 'POST',
  //   body: {
  //     file: `@"${statResult[0].path}"`,
  //     // file: data,
  //     name: 'StatCycle_API_Mobile0',
  //     description:
  //       'this time using the iOS app (not Swagger) -- Planet_Trek file',
  //     data_type: 'gpx',
  //     activity_type: 'Ride',
  //   },
  //   headers: {
  //     Authorization: `Bearer ${new_token}`,
  //     'Content-Type': 'multipart/form-data',
  //   },
  // }).then(POSTresponse => {
  //   console.log(POSTresponse);
  // });

  // return RNFS.readFile(statResult[1], 'utf8');
  // return 'content here (too long)';
  // }
  //   return 'no file';
  // })
  // .then(contents => {
  //   console.log(contents);
  // });

  // TODO: this checks the status of an upload -- likely working, just don't have the ID of an upload since none have worked
  // const longID = 123456;
  // const getUploadStatus = await fetch('https://www.strava.com/api/v3/uploads', {
  //   method: 'POST',
  //   body: {
  //     uploadId: longID,
  //   },
  //   headers: {
  //     Authorization: `Bearer ${new_token}`,
  //   },
  // });

  // TODO: this works with scope == activity:read_all
  //   const getActivity = await fetch(
  //     'https://www.strava.com/api/v3/activities/8232476919',
  //     {
  //       method: 'GET',
  //       headers: {
  //         Authorization: `Bearer ${new_token}`,
  //       },
  //     },
  //   );
  //   console.log(getActivity);
}
