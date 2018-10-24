// Reference mocha-typescript's global definitions:
// eslint-disable-next-line spaced-comment
/// <reference path='../node_modules/mocha-typescript/globals.d.ts' />
import * as firebase from '@firebase/testing';
import * as fs from 'fs';

/*
 * ============
 *    Setup
 * ============
 */
const projectIdBase = 'firestore-emulator-example-' + Date.now();

const rules = fs.readFileSync('firestore.rules', 'utf8');

let testNumber = 0;

/**
* Returns the project ID for the current test
*
* @return {string} the project ID for the current test.
*/
function getProjectId() {
  return `${projectIdBase}-${testNumber}`;
}

/**
 * Creates a new app with authentication data matching the input.
 *
 * @param {object} auth the object to use for authentication (typically {uid: some-uid})
 * @return {object} the app.
 */
function authedApp(auth) {
  return firebase.initializeTestApp({
    projectId: getProjectId(),
    auth: auth,
  }).firestore();
}

/*
 * ============
 *  Test Cases
 * ============
 */
/* eslint-disable require-jsdoc */
class TestingBase {
  async before() {
    // Create new project ID for each test.
    testNumber++;
    return firebase.loadFirestoreRules({
      projectId: getProjectId(),
      rules: rules,
    });
  }

  async after() {
    await Promise.all(firebase.apps().map((app) => app.delete()));
  }
}

// eslint-disable-next-line no-unused-vars
@suite class MyApp extends TestingBase {
  @test async 'require users to log in before creating a profile'() {
    const db = authedApp(null);
    const profile = db.collection('users').doc('alice');
    await firebase.assertFails(profile.set({birthday: 'January 1'}));
  }

  @test async 'should let anyone create their own profile'() {
    const db = authedApp({uid: 'alice'});
    const profile = db.collection('users').doc('alice');
    await firebase.assertSucceeds(profile.set({birthday: 'January 1'}));
  }

  @test async 'should let anyone read any profile'() {
    const db = authedApp(null);
    const profile = db.collection('users').doc('alice');
    await firebase.assertSucceeds(profile.get());
  }

  @test async 'should let anyone create a room'() {
    const db = authedApp({uid: 'alice'});
    const room = db.collection('rooms').doc('firebase');
    await firebase.assertSucceeds(room.set({
      owner: 'alice',
      topic: 'All Things Firebase',
    }));
  }

  @test async 'should force people to name themselves as room owner when creating a room'() {
    const db = authedApp({uid: 'alice'});
    const room = db.collection('rooms').doc('firebase');
    await firebase.assertFails(room.set({
      owner: 'scott',
      topic: 'Firebase Rocks!',
    }));
  }

  @test async 'should not let one user steal a room from another user'() {
    const alice = authedApp({uid: 'alice'});
    const bob = authedApp({uid: 'bob'});

    await firebase.assertSucceeds(bob.collection('rooms').doc('snow').set({
      owner: 'bob',
      topic: 'All Things Snowboarding',
    }));

    await firebase.assertFails(alice.collection('rooms').doc('snow').set({
      owner: 'alice',
      topic: 'skiing > snowboarding',
    }));
  }
}
/* eslint-enable require-jsdoc */
