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


export { toUpperCamelCase, getTextBetweenTwoStrings, deepValue, numberWithCommas, randomElement, addHours };