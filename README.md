# InnerTube

This is the repository for an Chrome Extension that allows searching Youtube videos based on their captions.

## Installation

This extension is entirely self contained and does not require any other servers to run. To use it you will need:
- Google Chrome.
- A Google account.

To install this in Google Chrome, please open it and then:
- Navigate to chrome://extensions​
- Expand the Developer dropdown menu and click “Load Unpacked Extension”​
- Navigate to the local folder containing the extension’s code and click Ok​
- Assuming there are no errors, the extension should load into your browser

Above instructions are from [this](https://superuser.com/questions/247651/how-does-one-install-an-extension-for-chrome-browser-from-the-local-file-system) superuser response.

Once installed, click the extension. This should trigger the authentication flow. (Note that the [captions.download](https://developers.google.com/youtube/v3/docs/captions/download) requires some unusally high level of permissions. This extension will only use the captions.list and captions.download endpoints, and not use your data in any other way. In addition the tokens are only stored in your Chrome browser, and are not sent to any non-Google services).

After authenticating, you can navigate to a Youtube video. Clicking the extension will cause it to download the captions, and prepare a search index. If the video allows third party downloads of captions you should then be presented with a search page. Typing into the search bar will automatically search the video. Clicking a search result will take you to the portion of the video for that captions section.

Some videos that allow third party caption downloads:
- [How Turbochargers Work](https://www.youtube.com/watch?v=zenMEj0cAC4)
- [Camera Review](https://www.youtube.com/watch?v=70F_S_s5fBw)
- [Differential Equations](https://www.youtube.com/watch?v=p_di4Zn4wz4)
- [Natural Language Content Analysis](https://www.youtube.com/watch?v=p_di4Zn4wz4)
- [Learning Sentiment Lexicons](https://www.youtube.com/watch?v=Ogm5E2JNCzg)

## Implementation