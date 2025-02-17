/**
 * Topic: Releasing the room when no one is attending
 * Author: rudferna@cisco.com
 * Team: collaboration FRANCE
 * Version: 1.4
 * Date: 12/05/2021
 */


 import xapi from 'xapi';

 /*
  * ********************************
  * EDIT THIS SECTION BELOW
  * ********************************
  */

 /* 1. At what level is the human voice audible
  * Below you can set this level and enable sound detection
  */
 const USE_SOUND = false;
 const SOUND_LEVEL = 50;


 /* 2. If a call is detected so there is a presence
  * Below you can enable or disable call detection
  */
 const USE_ACTIVE_CALLS = true;


 /* 3. If the device is Receiving or Sending content so there is a presence
  * Below you can enable or disable presentation detection
  */
 const USE_PRESENTATION_MODE = true;

 /* 4. This const is to be set to true when ultrasound cannot be trusted (e.g. open meeting spaces)
  */
 const USE_PEOPLE_COUNT_ONLY = false;


 /* 5. When USE_PRESENCE_AND_COUNT is set to true, ultrasound presence or people counting will both be required to detect presence
  * If it is set to false, it will require either or.
  * We recommend setting this value to true when people outside of the room can be detected by the camera (e.g. glass walls)
  */
 const USE_PRESENCE_AND_COUNT = false;


 /* 6. When USE_GUI_INTERACTION is set to true, the click/interaction with userinterface extensions (panel, button, slider, toogle etc) is used to detect presence.
  * If it is set to false, it's not used.
  */
 const USE_GUI_INTERACTION = true;

 /*
  * *********************************
  * *********************************
  * *********************************
  *  DO NOT CHANGE BELOW THIS LINE
  * *********************************
  * *********************************
  * *********************************
  */


 /* Set the thresholds. They define how much time it needs to pass before a room is booked or released
  * Tip: For huddle spaces those numbers are usually smaller, while for bigger boardrooms we recommend larger thresholds
  */
 const MIN_BEFORE_BOOK = 5; // in minutes
 const MIN_BEFORE_RELEASE = 5; // in minutes

 const USE_ULTRASOUND = !USE_PEOPLE_COUNT_ONLY ? true : false;
 let alertDuration;
 let refreshInterval;
 let delete_timeout;
 var forcedUpdate;
 let bookingIsActive = false;
 let listenerShouldCheck = true;
 let bookingId;
 let meetingId;

 async function beginDetection() {
     /* * Entry point for the macro */
     //when meeting starts
     xapi.Event.Bookings.Start.on(async booking_info => {
         console.log("Booking " + booking_info.Id + " detected");
         await presence.updatePresence(); // initialize data
         bookingId = booking_info.Id;
         xapi.Status.Bookings.Availability.Status.get().then(availability => {
             if (availability === 'BookedUntil') {
                 xapi.Command.Bookings.Get({
                     Id: booking_info.Id
                 }).then(booking => {
                     meetingId = booking.Booking.MeetingId;
                     bookingIsActive = true;
                     listenerShouldCheck = true;

                     //each minutes it check if _checkPresenceAndProcess should be called (in order to declare a room empty or full).
                     //This is done because the update depends on listeners and if no events are detected the method will never be called
                     /*forcedUpdate = setInterval(() => {

                         if (presence._isRoomOccupied()) {
                             if ((presence._lastFullTimer != 0)) {
                                 if (Date.now() > (presence._lastFullTimer + MIN_BEFORE_BOOK * 60000)) {
                                     console.log("It's been a while since nothing happen... Forced update");
                                     presence._checkPresenceAndProcess();
                                 }
                             }
                         } else {
                             if (presence._lastEmptyTimer != 0) {
                                 if (Date.now() > (presence._lastEmptyTimer + MIN_BEFORE_RELEASE * 60000) && !presence._roomIsEmpty) {
                                     console.log("It's been a while since nothing happen... Forced update");
                                     presence._checkPresenceAndProcess();
                                 }
                             }
                         }

                     }, (MIN_BEFORE_BOOK * 60000) + 1000);*/
                 });
             } else {
                 bookingId = null;
                 meetingId = null;
                 /*presence._lastFullTimer = 0;
                 presence._lastEmptyTimer = 0;
                 presence._roomIsFull = false;
                 presence._roomIsEmpty = false;*/
                 console.log("Booking was detected but shouldn't have been");
             }
         });
     });

     //when meeting ends
     xapi.Event.Bookings.End.on(booking_info => {
         xapi.Command.UserInterface.Message.Prompt.Clear({
             FeedbackId: "alert_response"
         });
         xapi.Command.UserInterface.Message.TextLine.Clear({});
         clearInterval(forcedUpdate);
         clearTimeout(delete_timeout);
         bookingIsActive = false;
         listenerShouldCheck = false;
         bookingId = null;
         meetingId = null;
         /*presence._lastFullTimer = 0;
         presence._lastEmptyTimer = 0;
         presence._roomIsFull = false;
         presence._roomIsEmpty = false;*/
         console.log("Booking " + booking_info.Id + " ended Stop Checking");
     });


     //Active Call
     /*xapi.Status.SystemUnit.State.NumberOfActiveCalls.on(numberOfcall => {
         if (bookingIsActive) {
             console.log("Number of active call: " + numberOfcall);
             if (parseInt(numberOfcall) > 0 && USE_ACTIVE_CALLS) {
                 presence._data.inCall = true;
                 presence._data.peoplePresence = true;
                 // if in call we set that people are present
             } else {
                 presence._data.inCall = false;
             }
             if (listenerShouldCheck) {
                 presence._checkPresenceAndProcess();
             }
         }
     });*/

     //Presence
     /*xapi.Status.RoomAnalytics.PeoplePresence.on(presenceValue => {
         if (bookingIsActive) {
             console.log("Presence: " + presenceValue);
             presenceValue = presenceValue === 'Yes' ? true : false;
             if (!USE_ULTRASOUND) {
                 // if ultrasound is disabled we set people presence
                 // based only of image reconigition
                 presenceValue = presence._data.peopleCount ? true : false;
             }
             presence._data.peoplePresence = presenceValue;

             if (presenceValue) {
                 xapi.Command.UserInterface.Message.Prompt.Clear({
                     FeedbackId: "alert_response"
                 });
                 xapi.Command.UserInterface.Message.TextLine.Clear({});
                 clearTimeout(delete_timeout);
                 clearInterval(refreshInterval);
                 presence._roomIsFull = true;
                 presence._roomIsEmpty = false;
                 listenerShouldCheck = true;
             }

             if (listenerShouldCheck) {
                 presence._checkPresenceAndProcess();
             }
         }
     });*/


     //People Count
     /*xapi.Status.RoomAnalytics.PeopleCount.Current.on(nb_people => {
         if (bookingIsActive) {
             console.log("People count: " + nb_people);
             nb_people = parseInt(nb_people);
             presence._data.peopleCount = nb_people === -1 ? 0 : nb_people;

             if (!USE_ULTRASOUND) {
                 // if ultrasound is disabled we set people presence
                 // based only of image reconigition
                 if (nb_people > 0) {
                     presence._data.peoplePresence = true;
                 } else {
                     presence._data.peoplePresence = false;
                 }
             }

             if (nb_people > 0) {
                 xapi.Command.UserInterface.Message.Prompt.Clear({
                     FeedbackId: "alert_response"
                 });
                 xapi.Command.UserInterface.Message.TextLine.Clear({});
                 clearTimeout(delete_timeout);
                 clearInterval(refreshInterval);
                 presence._roomIsFull = true;
                 presence._roomIsEmpty = false;
                 listenerShouldCheck = true;
             }
             if (listenerShouldCheck) {
                 presence._checkPresenceAndProcess();
             }
         }
     });*/


     //Sound Level
     /*xapi.Status.RoomAnalytics.Sound.Level.A.on(level => {
         if (bookingIsActive) {
             console.log("Sound level: " + level);
             level = parseInt(level);
             if ((level > SOUND_LEVEL) && USE_SOUND) {
                 presence._data.presenceSound = true;
             } else {
                 presence._data.presenceSound = false;
             }
             if (listenerShouldCheck) {
                 presence._checkPresenceAndProcess();
             }
         }
     });*/


     //Presentation Mode (Off/Receiving/Sending)
     /*xapi.Status.Conference.Presentation.Mode.on(mode => {
         if (bookingIsActive) {
             console.log("Presentation Mode: " + mode);
             mode = mode === 'Off' ? false : true;
             if (!USE_PRESENTATION_MODE) {
                 presence._data.sharing = false;
             } else {
                 presence._data.sharing = mode;
             }
             if (listenerShouldCheck) {
                 presence._checkPresenceAndProcess();
             }
         }
     });*/

     //GUI Interaction
     /*xapi.Event.UserInterface.Extensions.on(event => {
         if (bookingIsActive && USE_GUI_INTERACTION) {
             console.log("Touch Panel interaction detected");
             xapi.Command.UserInterface.Message.Prompt.Clear({
                 FeedbackId: "alert_response"
             });
             xapi.Command.UserInterface.Message.TextLine.Clear({});
             clearTimeout(delete_timeout);
             clearInterval(refreshInterval);
             //we consider that the room is used
             presence._roomIsFull = true;
             presence._roomIsEmpty = false;
             presence._lastFullTimer = Date.now();
             presence._lastEmptyTimer = 0;
             listenerShouldCheck = true;
             if (listenerShouldCheck) {
                 presence._checkPresenceAndProcess();
             }
         }
     });*/


     xapi.event.on('UserInterface Message Prompt Response', (event) => {
         switch (event.FeedbackId) {
             case 'alert_response':
                 switch (event.OptionId) {
                     case '1':
                         //To stop timeout and not delete current booking even if no presence is detected
                         clearTimeout(delete_timeout);
                         clearInterval(refreshInterval);
                         xapi.Command.UserInterface.Message.TextLine.Clear({});
                         listenerShouldCheck = true;
                         /*presence._data.peoplePresence = true;
                         presence._roomIsEmpty = false;
                         presence._roomIsFull = true;*/
                         break;
                     default:
                         break;
                 }
                 break;
             default:
                 break;
         }
     });

 }


 function updateEverySecond() {
     alertDuration = alertDuration - 1;
     if (alertDuration <= 0) {
         clearInterval(refreshInterval);
         xapi.Command.UserInterface.Message.TextLine.Clear({});
     } else {
         xapi.command('UserInterface Message TextLine Display', {
             text: 'This room seems unused. It will be released in ' + alertDuration + ' seconds.<br>Use the check-in button on the touch panel if you have booked this room.',
             duration: 0
         });

         //Forced message display every 3 seconds
         if (alertDuration % 3 == 0) {
             xapi.command("UserInterface Message Prompt Display", {
                 Text: "This room seems unused. It will be self-released.<br>Press check-in if you have booked this room",
                 FeedbackId: 'alert_response',
                 'Option.1': 'CHECK IN',
             }).catch((error) => {
                 console.error(error);
             });
         }
     }
 }


 /**
  * START Detection
  */
 beginDetection();
