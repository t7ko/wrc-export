
# Browser extension to download results or event summary from racenet

## How to install in Tampermonkey (Firefox, Chrome, and others)

* Install Tampermonkey addon for your browser
* Open this url:
  https://github.com/t7ko/wrc-export/raw/refs/heads/main/tampermonkey/racenet.user.js
* It will show Tampermonkey dialog for this script -- proceed to install.


### How to use

* Open the club page you want to download.
* Make sure you are on the first page in results table. If you plan to do full
  round export -- make sure you stay on the first stage, in `STAGE` mode (not
  in `TOTALS`).
   * If this is not the case, export will be incomplete or incorrect.
* Activate the extension: click `DL` button in top right corner of the page,
  select the format you need:
   * `JSON of all Stages`: json with all stages; supported by
     [Yoklmn](https://yoklmnracing.ru/championships/game/29) platform.  Adds
     Length of each stage, and average speed of pilots.
   * `Event Summary`: shows event summary in a pop-up dialog.
   * `CSV of Current Stage`: CSV of the currently visible table (current
     stage, or current totals, whatever is selected).
   * `CSV of All Stages`: CSV of all stages, plus overall totals.  Includes
     distance and average speed.


## How to install as an extension in Chrome

NOTE: Chrome extension is no longer supported, use as is. New features only
come to Tampermonkey format.

* Download content of `src/` folder and place it somewhere on your hard drive.
* Open `chrome://extensions/`
* Enable Developer Mode: In the top right corner of the Extensions page,
  you'll see a toggle switch labeled "Developer mode." Turn this switch on.
* Load unpacked: On the left side of the Extensions page, you'll see a
  button labeled "Load unpacked." Click it.
* Select the extension's directory: A file browser window will open. Navigate
  to the directory where you've stored the extension's source code.  Select
  the root directory of the extension (the folder that contains the
  manifest.json file) and click "Select Folder" (or similar wording depending
  on your operating system).


### How to use

* Open the club page you want to download.
* If you plan to do json export -- make sure you stay on the first stage, and
  on the first page in results table.  Otherwise export will be incomplete or
  incorrect.
* Activate the extension: click 'extensions' icon on top right, select `WRC Export`.
   * You may want to "pin" this extension for faster access.
* Click `Export` button.  It will download csv/json file to your `Downloads` folder.

