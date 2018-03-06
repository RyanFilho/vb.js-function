const functions = require('firebase-functions');
const cors = require('cors')({origin: false});

exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

exports.lexAnalyser = functions.https.onRequest((request, response) => {
    // var value = 'Class Program\n'
    // value += '    Sub Main(args As String())\n'
    // value += '        Console.WriteLine("aaa")\n'
    // value += '    End Sub\n'
    // value += 'End Class\n'
    const value = JSON.parse(`${request.body}`).code
    if(value === undefined){
        return response.status(400).send(value)
    }    
    var 
        isOperator      = c => /[+\-*\/\^%=(),]/.test(c),
        isDigit         = c => /[0-9]/.test(c),
        isQuotes        = c => c === "\"",
        isWhiteSpace    = c => /\s/.test(c),
        isTextFormat    = c => /\n|\t/.test(c),
        isReserved      = c => /\b(Class|Sub|End|As|Dim)\b/.test(c),
        isIdentifier    = c => typeof c === "string" && !isOperator(c) && !isDigit(c) && !isWhiteSpace(c) && !isReserved(c);
    
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
            errors: errors,
        };
    }
    
    var lexline = function (input, line) {
        var tokens = [], errors = [], c, col = 0;
        var advance = function () { return c = input[++col]; };
        var addToken = function (type, value, line, col) {
            tokens.push({
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
                addToken("operator", c, line, col+1);
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
                    addError(2,"Número \"" + num + "\" não é muito grande ou muito pequeno para um inteiro de 64 bits.", line, firstCol+1)
                else 
                    addToken("number", num, line, col+1);
            } else if (isQuotes(c)) {
                var firstCol = col;
                var str = c;            
                while (!isQuotes(advance()))
                {
                    if (c === undefined){
                        addError(1,"Você esqueceu de fechar a string.", line, firstCol+1)
                        console.log( + col+1);
                        break;
                    }
                    else{
                        str += c;
                    }
                }
                str += c;
                addToken("string", str, line, col+1);
                advance();
            }else if (isIdentifier(c)) {
                var firstCol = col;
                var idn = c;
                while (isIdentifier(advance()) || isDigit(c)) idn += c;
                if (isReserved(idn)) {
                    addToken("reserved", idn, line, col+1);
                } else {
                    addToken("identifier", idn, line, col+1);
                }            
            } else console.log(3, "Token não identificado \""+ c + "\".", line, col+1); 
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