import { fetchContentFromBeforeCurrentTime } from "./dbService"
import { postTextToTwitter } from "../Apis/twitter";
import { postMediaToLinkedIn } from "../Apis/linkedin";
export const contentCheck = async () => {
    console.log("contentCheck called");
    // fetch data from database 
    let contentData = await fetchContentFromBeforeCurrentTime();
    // example data:
    // [{"content_data": "test", "content_id": 1, "content_type": "post", "description": null, "post_date": 1727999400, "published": 0, "tags": null, "user_id": 1}, {"content_data": "test", "content_id": 3, "content_type": "post", "description": null, "post_date": 1731867900, "published": 0, "tags": null, "user_id": 1}, {"content_data": "test on the 16th", "content_id": 4, "content_type": "post", "description": null, "post_date": 1731781860, "published": 0, "tags": null, "user_id": 1}]
    // we don't have to filter data, check time, nor check if data is correct, nor see if its been published as it's already filtered in the dbService
    // we loop through the data to post different social media accounts
    // for now we are only posting to twitter then linkedin


    // forloop:
        // we get user_id and creds from the dbService
        // if the status is unauthorized, we send a noticification via notifee? - Still thinking
        // we post to twitter
        // we post to linkedin
        // we post to etc
        // we update the status to published
        // NOTE: We need to add a published_at field to the database
    // We commit the changes to the database
    // We send a notification to the user that the content has been posted via notifee (If the app is closed)

    for (const content of contentData) {
        const { user_id, content_id, content_data } = content;

        // Fetch user credentials from dbService
        // const userCreds = await fetchUserCredentials(user_id);

        // Check if user credentials are valid
        // if (!userCreds || userCreds.status === 'unauthorized') {
        //     // Send notification via notifee
        //     await sendNotification(user_id, 'Unauthorized access. Please update your credentials.');
        //     continue;
        // }

        // Post to Twitter
        // await postTextToTwitter(userCreds.twitter, content_data);
        // await postTextToTwitter(content_data,
        //     "consumer_api_key",
        //     "consumer_api_secret",
        //     "access_token",
        //     "access_token_secret"
        // )


        // Post to LinkedIn
        // await postMediaToLinkedIn(userCreds.linkedin, content_data);

        // Update the status to published
        // await updateContentStatus(content_id, { published: 1, published_at: new Date() });

        // // Send notification to the user that the content has been posted
        // await sendNotification(user_id, 'Your content has been posted successfully.');
    }

    console.log("TEST TEST TEST");
    console.log(contentData);
}