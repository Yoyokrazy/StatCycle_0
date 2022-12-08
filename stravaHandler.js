import {authorize} from 'react-native-app-auth';

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
  scopes: ['activity:write,read'],
};

export async function stravaInit() {
  //   console.log(`id:  ${client_id}`);
  //   console.log(`sec: ${client_secret}`);

  const result = await authorize(config);
  const res = await fetch(
    `https://www.strava.com/oauth/deauthorize?access_token=${access_token}`,
    {
      method: 'POST',
    },
  );
}
// TODO: this is all for the reborn inapp browswer. OAuth2 package may be better
// // import { Alert } from "react-native";
// import {Alert, Linking} from 'react-native';
// import {InAppBrowser} from 'react-native-inappbrowser-reborn';

// const redirectUrl = encodeURIComponent('StatCycleApp://localhost');
// //"http://localhost:3000/Home";

// export async function stravaAuth() {
//   const regex = /[^\\=]+[a-zA-Z0-9](?=&)/gm;
//   const scope = 'activity:write,read';
//   const url =
//     'https://www.strava.com/oauth/mobile/authorize?client_id=' +
//     '51842' + //want to be client id programatically from .env
//     '&redirect_uri=' +
//     redirectUrl +
//     '&response_type=code&approval_prompt=auto&scope=' +
//     scope;
//   try {
//     if (await InAppBrowser.isAvailable()) {
//       InAppBrowser.openAuth(url, redirectUrl, {
//         // iOS Properties
//         ephemeralWebSession: false,
//       }).then(response => {
//         if (response.type === 'success' && response.url) {
//           Linking.openURL(response.url);
//           Alert.alert(response.url.match(regex)[0]);
//           //   storeData(response.url.match(regex)[0]);
//         }
//       });
//     } else {
//       Linking.openURL(url);
//     }
//   } catch (error) {
//     Linking.openURL(url);
//   }
// }
