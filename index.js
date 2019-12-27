//libs
let rl = require('readline-sync');
let chalk = require('chalk');
let fs = require('fs')
let irc = require('dank-twitch-irc');
let config = require('./config.json');

//process termination message
process.on('SIGINT', () => {
    rl.keyInPause(chalk.blueBright('\nThanks for using asd client, shutting down :)'));
    process.exit();
});

//motd
console.log(
`=============================================\n${chalk.bold('asd™ Twitch client, quick Pepega test-project')}`
+`\ncreated by: ${chalk.hex('#f97304')('zneix')}\n=============================================`);
initmain();

//defs
async function initmain(){
    console.log('\nMain menu');
    let loginChoices = [
        // `Quick login: ${config.quickLogin.available?chalk.green(config.quickLogin.username):chalk.red('Unavailable!')}`,
        'Configured account',
        'New account'
    ];
    let loginChoice = rl.keyInSelect(loginChoices, chalk.magentaBright('Select login option: '), {guide: false, cancel: 'Exit asd client'});
    switch(parseInt(loginChoice)){
        case -1:process.emit('SIGINT');
        // case 0:
        //     console.log(`Trying ${config.quickLogin.username}...`);
        //     break;
        case 0:
            console.log(`\nLogin menu`);
            if (!fs.existsSync(`${__dirname}\\accounts`)) fs.mkdirSync(`${__dirname}\\accounts`);
            fs.readdir('./accounts', (err, files) => {
                if (err) return console.log(err);
                files = files.filter(f => f.endsWith('.json'));
                let accArr = [];
                files.forEach(file => accArr.push(file.slice(0, -5)));
                if (accArr.length){
                    let accIndex = rl.keyInSelect(accArr, chalk.magentaBright('Select account: '), {guide: false, cancel: 'Exit and add new account'});
                    if (accIndex == -1) return initmain();
                    return validateAcc(require(`./accounts/${accArr[accIndex]}`), 'log');
                }
                else {
                    rl.keyInPause(chalk.redBright('Looks like there are no accounts, add a new one'));
                    return initmain();
                }
            });
            break;
        case 1:
            console.log(`\nIf you want to add new account:\n1. Enter Twitch username\n2. Head over to link below and copy and paste generated token\n\n${chalk.blue(config.tokenLink)}`
            +'\n\n========================');
            let newAcc = getNewAccount();
            await validateAcc(newAcc, 'save');
    }
}
function getNewAccount(){
    console.log(`To return to menu, enter ${chalk.bold('//exit')}`);
    // let username = rl.question('Enter Twitch username>> ', {limit: /^[a-z0-9_]{4,25}$/i, limitMessage: 'Invalid username'});
    // let token = rl.question('Enter generated token>> ', {limit: /^[a-z0-9]{30}$/, limitMessage: 'Invalid token'});
    let username = rl.question('Enter Twitch username>> ', {limit: /.+/, limitMessage: ''});
    if (username == '//exit') return initmain();
    let token = rl.question('Enter generated token>> ', {limit: /.+/, limitMessage: ''});
    if (token == '//exit') return initmain();
    let xd;
    while (xd !== true && xd !== false) {xd = rl.keyInYN(`\nusername: ${username}\ntoken: ${token}\nAre those credentials correct?`);}
    if (!xd) return getNewAccount();
    console.log()
    return {username: username, token: token};
}
async function validateAcc(creds, wtd){
    console.log(chalk.yellow(`Trying ${creds.username}, after 7s it'll be marked as invalid...`));
    let vclient = new irc.ChatClient({username: creds.username, password: 'oauth:'+creds.token});
    vclient.connect();
    let TTL = setTimeout(function(){
        vclient.destroy();
        console.log(chalk.redBright('Invalid account, returning!\n'));
        return initmain();
    }, 7000);
    vclient.on('ready', () => {
        clearTimeout(TTL);
        vclient.destroy();
        console.log(chalk.green('Valid account, continuing!\n'));
        switch(wtd){
            case 'save':
                saveAcc(creds);
                break;
            case 'log':
                log(creds);
                break;
        }
    });
}
async function saveAcc(newAcc){
    if (!fs.existsSync(`${__dirname}\\accounts`)) fs.mkdirSync(`${__dirname}\\accounts`);
    console.log(fs.existsSync(`${__dirname}\\accounts\\${newAcc.username}.json`)
    ?chalk.redBright(`Account ${newAcc.username} already exists, overwriting!`)
    :chalk.yellowBright(`Saving ${newAcc.username}...`));
    fs.writeFileSync(`${__dirname}\\accounts\\${newAcc.username}.json`, JSON.stringify(newAcc, null, 4));
    console.log(chalk.greenBright(`Account ${newAcc.username} saved successfully!\n`));
    rl.keyInPause(chalk.blueBright('Return to account selection'));
    return initmain();
}
async function log(creds){
    let client = new irc.ChatClient({username: creds.username, password: creds.token});
    let channel;
    client.on('connecting', () => console.log(chalk.yellowBright('Connecting to Twitch network!')));
    client.on('connect', () => console.log(chalk.hex('#cbb212')('Connected to Network!')));
    client.on('ready', () => {
        console.log(chalk.greenBright('Connected to Twitch IRC!'));
        channel = null;
        process.stdin.resume();
    });
    client.on('close', err => console.log(`Client closed ${err?chalk.bold.red(`due to an error: ${err}`):'without errors'}`));
    client.on('error', err => console.log(`Client ${chalk.red('ERRORED')} ${err?chalk.bold.red(`due to an error: ${err}`):'without errors'}`));
    client.on('message', msg => {
        let ignoredIRCs = ['USERSTATE', 'PRIVMSG', 'PING', 'PONG', 'JOIN', 'PART', 'WHISPER'];
        // if (!ignoredIRCs.includes(msg.ircCommand)) console.log(msg);
    });
    client.on('PRIVMSG', msg => {
        let mbdg = '';
        if (msg.badges.hasBroadcaster) mbdg += (chalk.bgHex('#e71818')('B'));
        if (msg.badges.hasModerator) mbdg += (chalk.bgHex('#14b866')('M'));
        if (msg.badges.hasVIP) mbdg += (chalk.bgHex('#b33ff0')('V'));
        if (msg.badges.hasSubscriber) mbdg += (chalk.bgHex('#6441a4')('S'));
        let msgToSend = `${msg.colorRaw?chalk.hex(msg.colorRaw)(msg.displayName):msg.displayName}: ${msg.isAction?msg.colorRaw?chalk.hex(msg.colorRaw)(msg.messageText):msg.messageText:msg.messageText}`;
        console.log(`${mbdg.length<48 ? `${mbdg}${' '.repeat((48-mbdg.length)/24)}` : mbdg} `+(msg.messageText.includes(creds.username)?chalk.bgHex('#4b282c')(msgToSend):(colorbg ? chalk.bgHex('#202020')(msgToSend) : msgToSend)));
        colorbg ? colorbg = false : colorbg = true;
    });
    client.on('NOTICE', notice => {console.log(chalk.grey(notice.messageText));});
    // client.on('ROOMSTATE', state => {console.log(state);});
    client.on('WHISPER', msg => console.log(`${chalk.bgWhiteBright.bold.hex('#000000')('WHISPER!')} ${msg.senderUsername}: ${msg.messageText}`));
    client.on('JOIN', msg => {
        lastmsg = '';
        colorbg = false;
        console.log(chalk.cyan(`JOIN: Joined ${msg.channelName}`));
    });
    client.on('PART', msg => {
        lastmsg = '';
        colorbg = false;
        console.log(chalk.cyan(`PART: Left ${msg.channelName}`));
    });
    client.on('USERSTATE', msg => {
        if (!lastmsg) return;
        let mbdg = '';
        if (msg.badges.hasBroadcaster) mbdg += (chalk.bgHex('#e71818')('B'));
        if (msg.badges.hasModerator) mbdg += (chalk.bgHex('#14b866')(chalk.black('M')));
        if (msg.badges.hasVIP) mbdg += (chalk.bgHex('#b33ff0')('V'));
        if (msg.badges.hasSubscriber) mbdg += (chalk.bgHex('#6441a4')('S'));
        let msgToSend = `${msg.colorRaw?chalk.hex(msg.colorRaw)(msg.displayName):msg.displayName}: ${msg.isAction?msg.colorRaw?chalk.hex(msg.colorRaw)(lastmsg):lastmsg:lastmsg}`;
        console.log(`${mbdg.length<48 ? `${mbdg}${' '.repeat((48-mbdg.length)/24)}` : mbdg} `+(colorbg ? chalk.bgHex('#202020')(msgToSend) : msgToSend));
        colorbg ? colorbg = false : colorbg = true;
        lastmsg = '';
    });
    client.on('USERNOTICE', unot => {
        // console.log(unot);
    });
    client.on('CLEARCHAT', msg => {
        console.log(chalk.grey(`${msg.targetUsername} has been ${msg.banDuration? `timed out for ${msg.banDuration} seconds.`: 'perma-banned.'}`))
    });
    client.connect();
    let lastmsg = '';
    let colorbg = false;
    process.stdin.on('data', async d => {
        let message = d.toString().trim();
        if (message.startsWith('//')){
            let cmd = message.slice(2).trim().toLowerCase().split(' ')[0];
            if (!cmd.length) return;
            let args = message.slice(2+cmd.length).trim().split(/ /g);
            switch(cmd){
                case 'part':
                    if (client.joinedChannels.size > 0) client.part([...client.joinedChannels][0]);
                    channel = null;
                    break;
                case 'join':
                    if (client.joinedChannels.size > 0) client.part([...client.joinedChannels][0]);
                    await client.join(args[0].toLowerCase());
                    if (client.joinedChannels.size > 0) channel = [...client.joinedChannels][0];
                    break;
                case 'channel':
                    console.log(`Talking in ${channel}, leave with ${chalk.bold('//part '+channel)}`);
                    break;
                case 'exit':
                    process.emit('SIGINT');
                    // client.close();
                    // client.destroy();
                    // client.part(channel)
                    // rl.keyInPause(chalk.blueBright('Disconnected, press to proceed to user select'));
            }
        }
        else if (channel){
            lastmsg = message;
            client.privmsg(channel, message);
        }
        else console.log('No channel joined, join one with '+chalk.bold('//join <channel>'));
    });
}
// curl --header "Accept: application/vnd.twitchtv.v5+json" --header "Client-ID: cfm058kb3l9cxj30tztcbh1nppcct3" --request GET https://api.twitch.tv/kraken/users?login=zneix