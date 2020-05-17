const http = require('http')
const WebSocket = require('websocket').server
const games = {}
const clients = {}
const CROSS_SYMBOL = 'x'
const CIRCLE_SYMBOL = 'o'
const WIN_STATES = Array([0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6])

const httpServer = http.createServer((request, response) => {
    // 
})

const socketServer = new WebSocket({
    'httpServer': httpServer
})
socketServer.on('request', request => {
    const connection = request.accept(null, request.origin)
    connection.on('open', connectionOpened)
    connection.on('close', () => {})
    connection.on('message', messageHandler)

    const clientId = Math.round(Math.random() * 100) + Math.round(Math.random() * 100) + Math.round(Math.random() * 100)
    clients[clientId] = { 'clientId': clientId, 'connection': connection }
    connection.send(JSON.stringify({ 'method': 'connect', 'clientId': clients[clientId].clientId }))
    sendAvailableGames()
})

httpServer.listen(8080, () => { console.log('server listening on port 8080') })

function connectionOpened() {
    connection.send('connection with server opend')
}

function messageHandler(message) {
    const msg = JSON.parse(message.utf8Data)
    let player = {}
    switch (msg.method) {
        case 'create':
            // create logic
            player = {
                'clientId': msg.clientId,
                'symbol': CROSS_SYMBOL,
                'isTurn': true,
                'wins': 0,
                'lost': 0
            }
            const gameId = Math.round(Math.random() * 100) + Math.round(Math.random() * 100) + Math.round(Math.random() * 100)
            const board = [
                '', '', '',
                '', '', '',
                '', '', ''
            ]
            games[gameId] = {
                'gameId': gameId,
                'players': Array(player),
                'board': board
            }
            const payLoad = {
                'method': 'create',
                'game': games[gameId]
            }
            const conn = clients[msg.clientId].connection
            conn.send(JSON.stringify(payLoad))
            sendAvailableGames()
            break;
        case 'join':
            // join game logic
            player = {
                'clientId': msg.clientId,
                'symbol': CIRCLE_SYMBOL,
                'isTurn': false,
                'wins': 0,
                'lost': 0
            }
            games[msg.gameId].players.push(player)

            clients[msg.clientId].connection.send(JSON.stringify({
                'method': 'join',
                'game': games[msg.gameId]
            }))

            makeMove(games[msg.gameId])
            break

        case 'makeMove':
            console.log('before makeMove' + msg.game.gameId)
            games[msg.game.gameId].board = msg.game.board

            let currPlayer
            let playerSymbol
            msg.game.players.forEach((player) => {
                if (player.isTurn) {
                    currPlayer = player.clientId
                    playerSymbol = player.symbol
                }
            })
            let isWinner = false
            console.log(`game borad is ${games[msg.game.gameId].board}`)
            isWinner = WIN_STATES.some((row) => {
                return row.every((cell) => { return games[msg.game.gameId].board[cell] == playerSymbol ? true : false })
            })
            console.log(`isWinner = ${isWinner} symbol= ${playerSymbol}`)
            if (isWinner) {
                const payLoad = {
                    'method': 'gameEnds',
                    'winner': playerSymbol
                }
                console.log(`isWinner = ${isWinner} symbol= ${playerSymbol}`)
                games[msg.game.gameId].players.forEach(player => {
                    clients[player.clientId].connection.send(JSON.stringify(payLoad))
                })
                break
            }
            // logic for draw goes herer
            else {
                const isDraw = WIN_STATES.every(state => {
                    return state.some(index => {
                        return games[msg.game.gameId].board[index] == 'x'
                    }) && state.some(index => {
                        return games[msg.game.gameId].board[index] == 'o'
                    })
                })
                if (isDraw) {
                    const payLoad = {
                        'method': 'draw',
                    }
                    games[msg.game.gameId].players.forEach(player => {
                        clients[player.clientId].connection.send(JSON.stringify(payLoad))
                    })
                    break
                }
            }
            games[msg.game.gameId].players.forEach((player) => {
                player.isTurn = !player.isTurn
            })
            makeMove(games[msg.game.gameId])
            break
    }
}


function makeMove(game) {
    const payLoad = {
        'method': 'updateBoard',
        'game': game
    }
    game.board.forEach(cell => console.log(`  ${cell}`))
    game.players.forEach((player) => {
        console.log(`player ${player.clientId}`)
        clients[player.clientId].connection.send(JSON.stringify(payLoad))
    })

}

function sendAvailableGames() {

    const allGames = []
    for (const k of Object.keys(games)) {
        if (games[k].players.length < 2) {
            allGames.push(games[k].gameId)
        }
    }
    const payLoad = { 'method': 'gamesAvail', 'games': allGames }
    for (const c of Object.keys(clients))

    { clients[c].connection.send(JSON.stringify(payLoad)) }
}