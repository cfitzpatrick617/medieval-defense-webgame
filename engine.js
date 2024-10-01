// timers
let timer = 0;
let freezeTimer = 0;
let freezeCooldownTimer = 0;

// game constants for timing
const WAVE_TIME = 30;
const UPGRADE_TIME = 15;
const FREEZE_ACTIVE_TIME = 3;
const FREEZE_COOLDOWN_TIME = 10;

// player stats
let canFreeze = false;
let waveNum = 0;
let waveActive = true;
let frozen = false;
let hp = document.getElementById("healthbar").children.length * 2;
let maxShots = 5;
let currentShots = 0;
let enemiesKilled = 0;
let shotsHit = 0;
let shotsFired = 0;
let score = 0;
let reloadTime = 3000;
let hasShortReload = false;
let canShoot = true;
let reloading = false;
let hasAmmo = true;
let hasExtraAmmo = false;
let hasExtraHeart = false;
let hasFreezeAbility = false;

//Enemy spawn info
let spawnOrderNum = 0;
let enemySpawnTime = 1300;
let spawnWaveActive = true;
let spawnActive = true;
const WAVE_SPAWN_RATES = [
    { "serf": 70, "chainmail": 25, "knight": 5 },
    { "serf": 55, "chainmail": 35, "knight": 10 },
    { "serf": 35, "chainmail": 50, "knight": 15 },
    { "serf": 20, "chainmail": 60, "knight": 20 },
    { "serf": 10, "chainmail": 65, "knight": 25 }
]

// audio effects are defined here
const BOW_SOUND = new Audio("res/audio/bow-shot.mp3");
const DEATH_SOUND = new Audio("res/audio/death-noise.mp3");
const PLAYER_DAMAGE_SOUND = new Audio("res/audio/damageTaken.mp3");
const FREEZE_SOUND = new Audio("res/audio/freeze-noise.mp3");

// game layers are defined here
const GAME_AREA = document.getElementById("mygamearea");
const WORLD = document.getElementById("world");
const LOWER_LAYER = document.getElementById("lowerSpawn");
const UPPER_LAYER = document.getElementById("upperSpawn");
const UPGRADE_BOARD = document.getElementById("upgrade");
const LEADERBOARD_SCREEN = document.getElementById('leaderboard');

// game elements are defined here
const HEALTHBAR = document.getElementById("healthbar");
const SCOREBOARD = document.getElementById("scoreboard");
let upgradeOptions = document.getElementById("upgradeOptions");

const focusCursor = function (event) {
    WORLD.style.cursor = "url('res/images/crosshair-focused.png') 35 35, auto"
}

const unfocusCursor = function (event) {
    WORLD.style.cursor = "url('res/images/crosshair.png') 35 35, auto"
}

const switchToScreen = function (newScreen) {
    for (const child of GAME_AREA.children) {
        child.style.zIndex = "0"; // hide all other screens
    }
    newScreen.style.zIndex = "1";
}

const startGame = function () {
    startWave();
    gameLoop(document.timeline.currentTime);
}

const endGame = function () {
    waveActive = false;
    spawnWaveActive = false;
    if (waveNum < 5) { // if the player died
        document.getElementById("gameVerdict").innerHTML = "You died!";
        document.getElementById("gameWaves").innerHTML = waveNum - 1;
    } else { // if the player made it to the end
        document.getElementById("gameVerdict").innerHTML = "You won!";
        document.getElementById("gameWaves").innerHTML = waveNum;
    }
    document.getElementById("gameScore").innerHTML = score;
    document.getElementById("gameEnemies").innerHTML = enemiesKilled;
    document.getElementById("gameShotsFired").innerHTML = shotsFired;
    document.getElementById("gameShotsHit").innerHTML = shotsHit;
    if (shotsFired == 0) { // avoid runtime error
        document.getElementById("gameAccuracy").innerHTML = `0%`;
    } else {
        document.getElementById("gameAccuracy").innerHTML = `${Math.round((shotsHit / shotsFired) * 100)}%`;
    }
    switchToScreen(document.getElementById("gameSummary"));
}

const displayLeaderboard = function(){
    fadeToBlack();
    createEndPage();
    switchToScreen(leaderboard);
}

// updates the arrow images to represent the current amount of shots remaining
const updateAmmo = function () {
    let currentAmmo = document.getElementById("ammo");
    currentAmmo.innerHTML = "";
    let leftOverShots = maxShots - currentShots;

    // interates through to display the images of the remaining bullets
    for (let i = 0; i < leftOverShots; i++) {
        var ammoPic = document.createElement("img");
        ammoPic.src = "res/images/ammoImg1.jpg";
        ammoPic.height = 30;
        ammoPic.width = 30;
        currentAmmo.appendChild(ammoPic)
    }

}

const shotTrack = function (event) {
    // do not count clicking buttons as shots
    if (event.target.tagName.toLowerCase() != "button") {
        currentShots++;
        updateAmmo();
        //ensures that the player has ammo before playing the bow firing sound
        if (hasAmmo == true) {
            BOW_SOUND.play();
        }
        shotsFired++;
    }
    if (currentShots == maxShots) {
        //shows the reload button when its needed
        hasAmmo = false;
        document.getElementById("reloadButton").style.display = "inline-block";
    }
}

const reloadShots = function () {
    currentShots = currentShots + 1;
    //checks if the player has used all of its current ammo`
    if (currentShots >= maxShots - 1 || reloading) {
        document.getElementById("reloadButton").style.display = "none";
        reloading = true;
        // this disables the ability to damage targets
        hasAmmo = false;
        // this function is used to reset the ammo of the player
        const resetShots = function () {
            currentShots = 0;
            //allows player to damage enemies
            hasAmmo = true;
            reloading = false;
            //updates the images of remaining arrows
            updateAmmo();
        }
        timerReload = setTimeout(resetShots, reloadTime);
    }
}

// function to determin the spawn order
const spawnOrderLoad = function (resultArray) {
    const spawnEnemies = function () {
        //if the wave is done it stops spawning new enemies
        if (spawnWaveActive == false) {
            clearInterval(enemySpawner);
            removeActiveEnemies();
            return;
        }

        if (spawnActive == false) {
            clearInterval(enemySpawnOrder)
            return;
        }

        // used to get a random number for the index
        const getRand = function () {
            let randNum = Math.random();
            return Math.round(randNum);;
        }

        if (spawnOrderNum < resultArray.length) {
            //interates through the array and sets up the attributes for them
            const enemyType = resultArray[spawnOrderNum];
            const enemy = document.createElement("div");
            enemy.setAttribute("class", `${enemyType} enemy`);
            enemy.dataset.damage = 0;
            let animation;

            let randNum = getRand();
            if (randNum === 0) {
                LOWER_LAYER.appendChild(enemy);
                // simple left to right animation for 5 seconds
                animation = enemy.animate(
                    [{ transform: "translateX(-100px)" },
                    { transform: `translateX(${GAME_AREA.offsetWidth}px)` }],
                    { duration: parseInt(getComputedStyle(enemy).getPropertyValue("--speed")) }
                )
            } else {
                UPPER_LAYER.appendChild(enemy);
                // simple right to left animation for 5 seconds
                animation = enemy.animate(
                    [{ transform: `translateX(${GAME_AREA.offsetWidth}px)` },
                    { transform: "translateX(-100px)" }],
                    { duration: parseInt(getComputedStyle(enemy).getPropertyValue("--speed")) }
                )
            }
            // add health indication
            enemy.innerHTML = getComputedStyle(enemy).getPropertyValue("--health");
            // if animation is completed, enemy wasn't killed
            animation.onfinish = function () {
                takeDamage(enemy);
                enemy.remove();
            };
            enemy.addEventListener("click", damageEnemy); // hitting an enemy
            enemy.addEventListener("mouseenter", focusCursor); // hovering over an enemy
            enemy.addEventListener("mouseleave", unfocusCursor); // moving away from an enemy
            spawnOrderNum++;
        } else {
            clearInterval(enemySpawner);
        }

    }

    const removeActiveEnemies = function () {
        //selects all active enmies and puts them into a node list
        let activeEnemies = document.querySelectorAll(".enemy");
        // creates an array from the nodelist
        let activeEnemiesArray = Array.from(activeEnemies);
        // iterates through the array and deletes and cancels the animation of all active enemies
        for (let i = 0; i < activeEnemiesArray.length; i++) {
            let currentEnemy = activeEnemiesArray[i];
            currentEnemy.getAnimations()[0].cancel();
            currentEnemy.remove();
        }
    }
    const enemySpawner = setInterval(spawnEnemies, enemySpawnTime);
}

const enemySpawnOrder = function () {
    // This defines the order and quanitify of enemy spawns

    // Used to generate a random integer inclusive of the min and max
    const randomNum = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const createArray = function (length, counts) {
        // creates an array with the 3 types of enemies
        let values = ["serf", "chainmail", "knight"];
        // This is used as a Shallow copy of the "Counts"
        let leftOverCounts = Object.assign({}, counts)

        const resultArray = [];

        let i = 0;
        for (i = 0; i < length; i++) {
            let correctVal = values.filter(value => leftOverCounts[value] > 0);
            //if the leftOverCounts are used then it breaks the loop
            if (correctVal.length == 0) break;

            const ranIndex = randomNum(0, correctVal.length - 1);
            const ranVal = correctVal[ranIndex];
            // builds the arrest
            resultArray.push(ranVal);
            leftOverCounts[ranVal] = leftOverCounts[ranVal] - 1;
        }

        //This will shuffle the array using the Fisher Yates Method
        const randomArray = function (resultArray) {
            for (let i = resultArray.length - 1; i > 0; i--) {
                let j = Math.floor(Math.random() * (i + 1));
                // this swaps the elements
                [resultArray[i], resultArray[j]] = [resultArray[j], resultArray[i]];
            }
        }

        randomArray(resultArray);
        return resultArray;
    }
    let arrayLength = 100;
        //defines the wave set
    let counts = WAVE_SPAWN_RATES[waveNum - 1];
    // creates the final array for spawning
    let spawnOrder = createArray(arrayLength, counts);

    return spawnOrder;
}

const damageEnemy = function (event) {
    if (hasAmmo == true) { // if they can shoot
        const enemy = event.target;
        const enemyStats = getComputedStyle(enemy);
        let damageTaken = parseInt(enemy.dataset.damage) + 1
        // set custom property to store the damage dealt so far for that enemy
        enemy.dataset.damage = damageTaken;
        // display enemy health
        enemy.innerHTML = enemyStats.getPropertyValue("--health") - damageTaken;
        // if enemy has died
        if (enemy.dataset.damage === enemyStats.getPropertyValue("--health")) {
            score += parseInt(enemyStats.getPropertyValue("--score"));
            SCOREBOARD.innerHTML = score; // update on-screen score
            event.target.getAnimations()[0].cancel();
            event.target.remove();
            DEATH_SOUND.play();
            enemiesKilled++;
            unfocusCursor();
        }
        shotsHit++;
    }
}

const freezeLayer = function (layer) {
    for (const enemy of layer.children) {
        // pause animation
        for (const animation of enemy.getAnimations()) {
            animation.pause();
        }
        // change enemy's sprite to be frozen
        enemy.style.backgroundImage = `url(${getComputedStyle(enemy).getPropertyValue("--frozenSprite")})`;
    }
}

const unfreezeLayer = function (layer) {
    for (const enemy of layer.children) {
        // resume animations
        for (const animation of enemy.getAnimations()) {
            animation.play();
        }
        // change enemy's sprite to be normal
        enemy.style.backgroundImage = `url(${getComputedStyle(enemy).getPropertyValue("--normalSprite")})`;
    }
}

const freezeScreen = function () {
    frozen = true;
    freezeLayer(UPPER_LAYER);
    freezeLayer(LOWER_LAYER);
    canFreeze = false;
    spawnActive = false;
    document.getElementById("freezeButton").setAttribute("class", "button-disabled");
    FREEZE_SOUND.play();
}

const unfreezeScreen = function () {
    frozen = false;
    spawnActive = true;
    unfreezeLayer(UPPER_LAYER);
    unfreezeLayer(LOWER_LAYER);
    // only play the unfreeze sound if any enemies are thawing
    if (UPPER_LAYER.children.length != 0 || LOWER_LAYER.children.length != 0) {
        FREEZE_SOUND.play();
    }
}

const raptureHeart = function (firstNonEmptyHeart) {
    const hearts = HEALTHBAR.children;
    // shake all hearts which are empty
    for (let i = hearts.length - 1; i > firstNonEmptyHeart; i--) {
        hearts[i].animate(
            [{ transform: "translate(0)" },
            { transform: "translate(3px, -3px)" },
            { transform: "translate(-3px, -3px)" },
            { transform: "translate(0)" }],
            { duration: 200, easing: "linear" }
        );
    }
}

const takeDamage = function (enemy) {
    let damage = getComputedStyle(enemy).getPropertyValue("--damage");
    // failsafe: cannot take damage if the player is dead
    if (hp > 0) {
        let heartPointer = Math.round(hp / 2) - 1;
        PLAYER_DAMAGE_SOUND.play();
        const heartNodes = HEALTHBAR.children;
        // if the player has lost all health
        if (hp - damage < 0) {
            hp = 0;
            // set remaining hearts to empty
            for (let i = 0; i < heartPointer + 1; i++) {
                heartNodes[i].src = "res/images/no-heart.png";
            }
        } else {
            let currentHeart = heartNodes[heartPointer];
            // remove any trailing half hearts
            if (hp % 2 != 0) {
                hp--;
                damage--;
                currentHeart.src = "res/images/no-heart.png";
                heartPointer--;
            }
            // continously apply damage until no damage can be applied
            while (damage > 0) {
                currentHeart = heartNodes[heartPointer];
                heartPointer--;
                // try to apply a full heart of damage
                if (damage - 2 >= 0) {
                    hp -= 2;
                    damage -= 2;
                    currentHeart.src = "res/images/no-heart.png";
                } else {
                    // if we cannot apply a full heart of damage then apply a half heart
                    hp--;
                    damage--;
                    if (hasExtraHeart && hp === 1) {
                        // account for golden heart sprite
                        currentHeart.src = "res/images/extra-half-heart.png";
                    } else {
                        currentHeart.src = "res/images/half-heart.png";
                    }
                }
            }
            raptureHeart(heartPointer); // animate damage
        }
    }
}

const resetHealth = function () {
    hp = HEALTHBAR.children.length * 2;
    for (const heart of HEALTHBAR.children) {
        heart.src = "res/images/full-heart.png";
    }
    if (hasExtraHeart) {
        HEALTHBAR.firstChild.src = "res/images/extra-full-heart.png";
    }
}

const addHeart = function () {
    const heart = document.createElement("img");
    heart.src = "res/images/no-heart.png";
    heart.alt = "hp";
    HEALTHBAR.appendChild(heart);
    hasExtraHeart = true;
}

const resetAmmo = function () {
    // resets the current ammo and allows the user to damage enemies  
    currentShots = 0;
    canShoot = true;
    hasAmmo = true;
    // hides the reload button
    document.getElementById("reloadButton").style.display = "none";
    updateAmmo();
}

// defines the time change for the timer upgrade
const upgradeTimer = function () {
    reloadTime = 2000;
    hasShortReload = true;
}

// defines the new max shots and resets the ammo
const upgradeAmmo = function () {
    maxShots = 7;
    hasExtraAmmo = true;
    resetAmmo();
}

const enableFreeze = function () {
    document.getElementById("freezeInterface").style.display = "block";
    hasFreezeAbility = true;
}

const resetFreezeButton = function () {
    document.getElementById("freezeButton").setAttribute("class", "blue-bordered");
    document.getElementById("freezeButton").innerHTML = "Freeze ready now!"
}

const selectUpgrade = function (event) {
    if (event.target.className === "upgrade-option") {
        // reset all upgrade options to be unselected
        for (const upgrade of upgradeOptions.children) {
            upgrade.setAttribute("class", "upgrade-option");
        };
        // select appropriate upgrade option
        event.target.setAttribute("class", "selected upgrade-option");
    }
}

const applyUpgrade = function () {
    let upgradePending;
    for (const upgrade of upgradeOptions.children) {
        // find which upgrade is selected
        if (upgrade.getAttribute("class") === "selected upgrade-option") {
            upgradePending = upgrade;
            break;
        };
    };
    // if an upgrade is pending it then applies the upgradePending
    if (upgradePending) {
        if (upgradePending === document.getElementById("addHeart") && !hasExtraHeart) {
            addHeart();
        } else if (upgradePending === document.getElementById("enableFreeze") && !hasFreezeAbility) {
            enableFreeze();
        } else if (upgradePending === document.getElementById("addAmmo") && !hasExtraAmmo) {
            upgradeAmmo();
        } else if (upgradePending === document.getElementById("upgradeReload") && !hasShortReload) {
            upgradeTimer();
        }
        upgradeOptions.removeChild(upgradePending); // make sure no update can be applied twice
    }
}

const resetTimers = function () {
    timer = 0;
    freezeCooldownTimer = 0;
    freezeTimer = 0;
}

const startWave = function (resultArray) {
    applyUpgrade();
    waveNum += 1;
    document.getElementById("waveNum").innerHTML = waveNum;
    waveActive = true;
    spawnWaveActive = true;
    resetTimers();
    // give player full ammo, health and freeze capability
    if (hasFreezeAbility) {
        canFreeze = true;
        resetFreezeButton();
    }
    resetHealth();
    resetAmmo();
    // determine spawning for wave
    let spawnArray = enemySpawnOrder();
    spawnOrderLoad(spawnArray);
    switchToScreen(WORLD);
}

const startUpgradePhase = function () {
    waveActive = false;
    spawnWaveActive = false;
    document.getElementById("timer").innerHTML = "Wave complete";
    timer = 0; // reset timer
    // wave summary
    document.getElementById("waveScore").innerHTML = score;
    document.getElementById("waveEnemies").innerHTML = enemiesKilled;
    document.getElementById("waveShotsFired").innerHTML = shotsFired;
    document.getElementById("waveShotsHit").innerHTML = shotsHit;
    if (shotsFired == 0) { // avoid runtime error
        document.getElementById("waveAccuracy").innerHTML = `0%`;
    } else {
        document.getElementById("waveAccuracy").innerHTML = `${Math.round((shotsHit / shotsFired) * 100)}%`;
    }
    document.getElementById("nextWaveTimer").innerHTML = UPGRADE_TIME;
    // auto select first available upgrade
    upgradeOptions.children[0].setAttribute("class", "selected upgrade-option");
    switchToScreen(UPGRADE_BOARD);
}

let lastTime = 0;
const gameLoop = function (deltaTime) {
    // if it is the first frame, make the difference between the current and last time zero
    if (lastTime === 0) {
        lastTime = deltaTime;
    }
    // find how long it has been since the last timestamp in seconds and add it to the timer
    timer += (deltaTime - lastTime) / 1000;
    if (waveActive) {
        if (timer >= WAVE_TIME - 1) { // if the wave is over
            if (waveNum === 5) {
                endGame();
                return; // QUIT GAME LOOP
            } else {
                startUpgradePhase();
            }
        } else if (hp === 0) {
            endGame();
            return; //QUIT GAME LOOP
        } else {
            // display how long is left in the wave
            document.getElementById("timer").innerHTML = Math.round(WAVE_TIME - timer);
            // check if frozen enemies should be unfrozen
            if (hasFreezeAbility) {
                if (frozen) {
                    if (frozen && (freezeTimer >= FREEZE_ACTIVE_TIME)) {
                        unfreezeScreen();
                        freezeTimer = 0;
                    } else {
                        freezeTimer += (deltaTime - lastTime) / 1000;
                    }
                }
                if (!canFreeze) {
                    if (freezeCooldownTimer >= FREEZE_COOLDOWN_TIME - 1) {
                        canFreeze = true;
                        freezeCooldownTimer = 0;
                        resetFreezeButton();
                    } else {
                        freezeCooldownTimer += (deltaTime - lastTime) / 1000;
                        document.getElementById("freezeButton").innerHTML = `Freeze ready in ${Math.round(FREEZE_COOLDOWN_TIME - freezeCooldownTimer)}`
                    }
                }
            }
        }
    } else {
        if (timer >= UPGRADE_TIME - 1) { // if the upgrade session is over
            startWave();
        } else {
            // display how long is left in the upgrade session
            document.getElementById("nextWaveTimer").innerHTML = Math.round(UPGRADE_TIME - timer);
        }
    }
    lastTime = deltaTime; // set the current timestamp to be the next loop's previous timestamp
    window.requestAnimationFrame(gameLoop);
}
// defines the area in which all of the divs will be created

function fadeToBlack() {
    // sets the background colour to black when called
    LEADERBOARD_SCREEN.style.backgroundColor = "black";
}

const createEndPage = function() {
    const gameOver = document.createElement("div");
    gameOver.className ="gameOverDes";
    gameOver.textContent = "Game Over";
    LEADERBOARD_SCREEN.appendChild(gameOver);
    gameOver.style.top = (leaderboard.offsetTop + leaderboard.offsetHeight / 2 - gameOver.offsetHeight / 2) + "px"; 


    const checkVis = function() {
        //this checks if the text has reaches the game area.
        const startingLoc = document.getElementById("leaderboard");
        const textLoc = gameOver.getBoundingClientRect();
        const targetLoc = startingLoc.getBoundingClientRect();

        if (textLoc.bottom >= targetLoc.top && textLoc.top <= targetLoc.bottom
            && textLoc.right >= targetLoc.left && textLoc.left <= targetLoc.right) {
            gameOver.style.visibility = "visible";
        } else {
            requestAnimationFrame(checkVis); // Checks each frame
        }
    }
    requestAnimationFrame(checkVis); // starts checking the frame for visibility

    const deleteOnFin = function() {
        gameOver.remove();
        gameOverFlag = true;
        showForm();
    }
    //This deletes the game over after 7 seconds
    const timer = setTimeout(deleteOnFin, 7000);

}

//grabs the userarray and parses it into a java object
function getUsersFromLocStor() {
    return JSON.parse(localStorage.getItem("userArray") || "[]"); 
}

const showForm = function() {
    // creates the form
    const inputForm = document.createElement("form");
    inputForm.className = "userEntry";

    const userLabel = document.createElement("label");
    userLabel.textContent = "Username:";
    inputForm.appendChild(userLabel);

    const userInput = document.createElement("input");
    userInput.type = "text";
    userInput.id = "username";
    inputForm.appendChild(userInput);

    const submitButton = document.createElement("button");
    submitButton.type = "button";
    submitButton.textContent = "Submit";
    inputForm.appendChild(submitButton);

    LEADERBOARD_SCREEN.appendChild(inputForm);

    const submitData = function () {
        //grabs the username from the form
        const username = document.getElementById("username").value;
        const scoreUser = score;
        let userArray = [];
        // gets the userarray from local storage and puts it in usersInStorage
        const usersInStorage = localStorage.getItem("userArray");
        
        //turns userArray into a javascript object
        if (usersInStorage !== null) {
            try {
                userArray = JSON.parse(usersInStorage);
            } catch (error) {
                // error handling
                console.error("There has been an error while parsing JSON", error);
            }
        }
        //enteres the data into the array
        userArray.push({ username, scoreUser});
        // turns it into a string 
        const userData = JSON.stringify(userArray);
        localStorage.setItem('userArray', userData);
        

        // hides the form and button
        submitButton.style.display = "none";
        userLabel.style.display = "none";
        userInput.style.display = "none";
        showLeaderboard();
    }

    submitButton.addEventListener("click", submitData);

}

const showLeaderboard = function() {
    const userArray = getUsersFromLocStor();
    // sorts the array into descending order
    userArray.sort((x, y) => y.scoreUser - x.scoreUser);

    //creates the html list
    const leaderList = document.createElement("ol")
    leaderList.className = "leaderboardList";

    // iterates through the user array, either until it reaches 5 values or the length of the userArray, whatever value is smaller
    for (let i = 0; i < Math.min(5 , userArray.length); i++) {
        const currentUser = userArray[i];
        const listOfItem = document.createElement("li");
        // creates the list of highscores
        listOfItem.textContent = `${currentUser.username}: ${currentUser.scoreUser}`;
        leaderList.appendChild(listOfItem);
    }

    const leaderboard = document.createElement("div");
    leaderboard.className = "leaderboard";
    leaderboard.innerHTML = "<h1>Top 5 Highest Scores!</h1>";
    leaderboard.style.top = ((leaderboard.offsetTop + leaderboard.offsetHeight / 2 - GAME_AREA.offsetHeight / 2) * -1) + "px";  
    leaderboard.appendChild(leaderList);

    LEADERBOARD_SCREEN.appendChild(leaderboard);
    leaderboard.style.display = "block";
}    

updateAmmo();

// event listeners
document.getElementById("startGameButton").addEventListener("click", startGame);
WORLD.addEventListener("click", shotTrack); // only shoot on world and not upgrade, start or end screens
document.getElementById("reloadButton").addEventListener("click", reloadShots);
document.getElementById("startWave").addEventListener("click", startWave);
upgradeOptions.addEventListener("click", selectUpgrade);
document.getElementById("freezeButton").addEventListener("click", freezeScreen);
document.getElementById("showLeaderboardButton").addEventListener("click", displayLeaderboard);

