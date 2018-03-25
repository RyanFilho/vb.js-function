const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const 
    numberId = 1, 
    stringId = 2, 
    operatorId = 3,
    identifiedId = 4,
    reservedId = 5;

exports.lexAnalyser = functions.https.onRequest((request, response) => {
    console.log(request.body);
    const value = JSON.parse(`${request.body}`).code
    console.log(value);
    if(value === undefined){
        return response.status(400).send(value)
    }    
    var 
        isOperator      = token => /[+\-*\/\^%=(),]/.test(token),
        isDigit         = token => /[0-9]/.test(token),
        isQuotes        = token => token === "\"",
        isWhiteSpace    = token => /\s/.test(token),
        isTextFormat    = token => /\n|\t/.test(token),
        isReserved      = token => /\b(Class|Sub|End|As|Dim)\b/.test(token),
        isIdentifier    = token => typeof token === "string" && !isOperator(token) && !isDigit(token) && !isWhiteSpace(token) && !isReserved(token);
    
    var lex = function(input){
        var tokens = [];
        var errors = [];
        input.split(/\r\n|\r|\n/g).map(function(value, line){
            var data = lexline(value, line+1);
            data.tokens.map(t => tokens.push(t));        
            data.errors.map(e => errors.push(e));        
        });
        return {
            tokens: tokens,
            messages: errors,
        };
    }
    
    var lexline = function (input, line) {
        var tokens = [], errors = [], c, col = 0;
        var advance = function () { return c = input[++col]; };
        var addToken = function (id, type, value, line, col) {
            tokens.push({
                id: id,
                type: type,
                value: value,
                line: line,
                col: col,
            });
        };
        var addError = function (id, error, line, col) {
            errors.push({
                id: id,
                error: error,
                line: line,
                col: col,
            });
        };
    
        while (col < input.length) {
            c = input[col];
            if (isWhiteSpace(c)) advance();
            else if (isOperator(c)) {
                addToken(operatorId, "operator", c, line, col+1);
                advance();
            } else if (isDigit(c)) {
                var firstCol = col;
                var num = c;
                while (isDigit(advance())) num += c;
                if (c === ".") {
                    do num += c; while (isDigit(advance()));
                }
                num = parseFloat(num);
                if (!isFinite(num)) 
                    addError(2,"Error: The number \"" + num + "\" is too large or too small for a 64-bit integer.", line, firstCol+1)
                else 
                    addToken(numberId, "number", num, line, col+1);
            } else if (isQuotes(c)) {
                var firstCol = col;
                var str = c;            
                while (!isQuotes(advance()))
                {
                    if (c === undefined){
                        addError(1,"Error: You did not close the string.", line, firstCol+1)
                        console.log( + col+1);
                        break;
                    }
                    else{
                        str += c;
                    }
                }
                str += c;
                addToken(stringId, "string", str, line, col+1);
                advance();
            }else if (isIdentifier(c)) {
                var firstCol = col;
                var idn = c;
                while (isIdentifier(advance()) || isDigit(c)) idn += c;
                if (isReserved(idn)) {
                    addToken(reservedId, "reserved", idn, line, col+1);
                } else {
                    addToken(identifiedId, "identifier", idn, line, col+1);
                }            
            } else console.log(3, "Error: Token not identified. \""+ c + "\".", line, col+1); 
        }         
        return {
            tokens: tokens,
            errors: errors,
        };   
    };   

    return cors(request, response, () => {
        var tokensAndErrors = lex(value);
        console.log('Sending data:', tokensAndErrors);
        response.set('Access-Control-Allow-Origin', "*")
        response.set('Access-Control-Allow-Methods', 'GET, POST')        
        response.status(200).send(tokensAndErrors);
    });
});