function toUpperCamelCase (text: string): string {
    return text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase());
}

function getTextBetweenTwoStrings(string: String, start: string, end: string) {
    const matches = string.match(new RegExp(`${start}(.*?)${end}`, 'g')) || []; 
    return [ matches, matches.map(match => match.slice(start.length, -end.length)) ]
}

function deepValue(obj: any, path: any){
    for (var i=0, path=path.split('.'), len=path.length; i<len; i++){
        obj = obj[path[i]];
    };
    return obj;
};

function numberWithCommas(x: any) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function randomElement(array: any) {
    return array[Math.floor((Math.random()*array.length))];
}

function addHours(date: Date, hours: number) {
    let now = new Date(date);
    now.setHours(now.getHours() + hours);
    return now;
}

function getTargetDate() {
    let now = new Date();
    let inGameTime = new Date(now.getTime() * 2);

    const hours = inGameTime.getUTCHours();
    const nextHourDate = new Date(inGameTime);

    nextHourDate.setUTCMinutes(0);
    nextHourDate.setUTCSeconds(0);
    nextHourDate.setUTCMilliseconds(0);

    if (hours >= 21 || hours < 9) {
        //noc
        if (nextHourDate.getUTCHours() >= 21) {
            nextHourDate.setUTCDate(nextHourDate.getDate() + 1);
        }
        
        nextHourDate.setUTCHours(9);
    } else {
        //dzien
        nextHourDate.setUTCHours(21);
    }

    const realTime = new Date();
    realTime.setTime(realTime.getTime() + ((nextHourDate.getTime()-inGameTime.getTime())/2))

    return realTime;
}


export { toUpperCamelCase, getTextBetweenTwoStrings, deepValue, numberWithCommas, randomElement, addHours, getTargetDate };