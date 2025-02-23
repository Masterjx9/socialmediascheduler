import { fetchContentFromBeforeCurrentTime } from "./dbService"

export const contentCheck = () => {
    let contentData = fetchContentFromBeforeCurrentTime();
    console.log("TEST TEST TEST");
    console.log(contentData);
}