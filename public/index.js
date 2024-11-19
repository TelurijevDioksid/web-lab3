// konfiguracijski objekt koji sadrži sve konstante
let conf = {
    // general
    resScale: 0.1,
    // ball
    ballColor: "blue",
    ballRadius: 8,
    ballSpeed: 5,
    ballStartAngleMin: 0.7854, // 45 stupnjeva u rad
    ballStartAngleMax: 2.3562, // 135 stupnjeva u rad
    // platform
    platformWidth: 100,
    platformHeight: 10,
    platformColor: "#654520",
    platformMoveSpeed: 10,
    // block
    blockScore: 1,
    blocksNum: 10, // broj blokova
}
let gState = 0 // game state 0-Menu, 1-Game, 2-Game over, 3-Options, 4-Game win
let cvs = null // canvas element
let ctx = null // canvas 2d context
let gBall = null // objekt lopta
let gPlatform = null // objekt platforma
let gPltDir = 0 // smjer platforme, 0 - stacionarno, 1 - lijevo, 2 - desno
let gScore = 0 // score trenutne igre
/*
 * objekt blokovi
 * arr - 2-dimenzijsko polje blokova
 * broken - koliko blokova je vidljivo
 * draw - funkcija za crtanje svih blokova iz arr i detekcija kolizije lopte i bloka
*/
const gBlocks = {
    arr: [],
    broken: 0,
    draw() {
        let bb = false
        for (let i = 0; i < this.arr.length; i++) {
            for (let j = 0; j < this.arr[i].length; j++) {
                if (!bb && this.arr[i][j].life > 0 && intersectCircle(gBall, this.arr[i][j])) {
                    bb = true
                    this.arr[i][j].life -= 1
                    gScore += this.arr[i][j].score
                    this.broken -= 1
                    gBall.vy = -gBall.vy
                } else {
                    this.arr[i][j].draw()
                }
            }
        }
    }
}
// lista objekata gumbova
const gBtns = []
/* objekt text boxeva odnosno user input
 * writeIdx: trenutni text box u kojem se piše
 * focusIdx: trenutni text box fokusirani
 * arr: lista objekata text box
 */
const gTxtBoxes = {
    writeIdx: -1,
    focusIdx: -1,
    arr: []
}

// funkcija provjerava presjek točke i pravokutnika
const intersectRect = (point, rect) => {
    return point.x >= rect.x && point.y >= rect.y &&
        point.x <= rect.x + rect.width &&
        point.y <= rect.y + rect.height
}

// funkcija provjerava presjek kruga i pravokutnika
const intersectCircle = (circle, rect) => {
    return circle.x + circle.radius > rect.x && circle.x - circle.radius < rect.x + rect.width &&
        circle.y + circle.radius > rect.y && circle.y - circle.radius < rect.y + rect.height
}

// inicijalizira loptu
const initBall = () => {
    // nasumični odabir kuta u rasponu od 45 do 135 stupnjeva
    const rad = Math.random() * (conf.ballStartAngleMax - conf.ballStartAngleMin) + conf.ballStartAngleMin
    gBall = {
        x: cvs.width / 2,
        y: cvs.height - 30,
        vx: conf.ballSpeed * Math.cos(rad),
        vy: -conf.ballSpeed * Math.sin(rad),
        radius: conf.ballRadius,
        draw() {
            ctx.beginPath()
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true)
            ctx.closePath()
            ctx.fillStyle = conf.ballColor
            ctx.fill()
        }
    }
}

// inicijalizira platformu
const initPlatform = () => {
    gPlatform = {
        x: cvs.width / 2 - conf.platformWidth / 2,
        y: cvs.height - conf.platformHeight - 10,
        width: conf.platformWidth,
        height: conf.platformHeight,
        draw() {
            if (gPltDir === 1 && this.x > 20) { // kretanje u lijevo
                this.x -= conf.platformMoveSpeed
            }
            if (gPltDir === 2 && this.x < cvs.width - this.width - 20) { // kretanje u desno
                this.x += conf.platformMoveSpeed
            }
            ctx.fillStyle = conf.platformColor
            ctx.fillRect(this.x, this.y, this.width, this.height)
        }
    }
}

// inicijalizira blokove
const initBlocks = () => {
    const blockWidth = Math.floor(0.1 * cvs.width)
    const blockHeight = 30
    const blocksPerRow = Math.floor(cvs.width / blockWidth)
    const rows = Math.ceil(conf.blocksNum / blocksPerRow)
    let blocksLeft = conf.blocksNum

    gBlocks.broken = conf.blocksNum
    // popunjavanje arr 2d polja globalnog objekta sa objektima zasebnog bloka
    gBlocks.arr = new Array(rows)
    for (let i = 0; i < gBlocks.arr.length; i++) {
        gBlocks.arr[i] = new Array(blocksLeft > blocksPerRow ? blocksPerRow : blocksLeft)
        blocksLeft -= blocksPerRow
        for (let j = 0; j < gBlocks.arr[i].length; j++) {
            gBlocks.arr[i][j] = {
                x: j * blockWidth,
                y: i * blockHeight,
                width: blockWidth,
                height: blockHeight,
                startLife: 1,
                life: 1,
                color: "#605678",
                strokeColor: "#E07B39",
                score: 1,
                draw() { // crta zaseban blok ukoliko nije razbijen
                    if (this.life === 0) {
                        return
                    }
                    ctx.fillStyle = this.color
                    ctx.fillRect(this.x, this.y, this.width, this.height)
                    ctx.beginPath()
                    ctx.strokeStyle = this.strokeColor
                    ctx.strokeWidth = 4
                    ctx.strokeRect(this.x, this.y, this.width, this.height)
                }
            }
        }
    }
}

// nalazi najveću rezoluciju kanvasa u omjeru 16/9 i vraća veličine kanvasa
const findCsvSize = () => {
    const bodyX = document.body.offsetWidth
    const bodyY = document.body.offsetHeight
    const maxW = Math.floor(bodyY * (16 / 9))
    const width = Math.min(bodyX, maxW) - 32
    const height = (width * 9) / 16 - 18
    return { width, height }
}

// postavlja i inicijalizira sve parametre
const startUp = () => {
    const s = findCsvSize()
    cvs.width = s.width
    cvs.height = s.height

    window.onresize = () => { // on resize handler postavlja novu rezoluciju kanvasa i ispisuje poruku
        const s = findCsvSize()
        cvs.width = s.width
        cvs.height = s.height

        window.cancelAnimationFrame(raf) || null
        ctx.clearRect(0, 0, cvs.width, cvs.height)
        ctx.font = "30px Arial"
        ctx.textAlign = "center"
        ctx.fillStyle = "black"
        ctx.fillText("Window changed, please refresh page!", cvs.width / 2, cvs.height - (0.5 * cvs.height))
    }

    // key down event ovisi o stanju igre
    cvs.onkeydown = (e) => {
        switch (gState) {
            case 0:
                break
            case 1: // igra u tijeku
                if (gPltDir !== 1 && e.which === 37) { // lijeva strelica
                    gPltDir = 1 // smjer platforme u lijevo
                }
                else if (gPltDir !== 2 && e.which === 39) { // desna strelica
                    gPltDir = 2 // smjer platforme u desno
                }
                else if (gPltDir !== 0) { // platforma miruje
                    gPltDir = 0 // postavi da platforma miruje
                }
                break
            case 2: // game over, pritisak na bilo koju tipku vraća na meni
                gState = 0
                drawMenu()
                break
            case 3: // podešavanje parametara, ukoliko je tipka znamenka od 0-9
                if (e.which >= 48 && e.which <= 57 && gTxtBoxes.focusIdx >= 0) {
                    gTxtBoxes.arr[gTxtBoxes.focusIdx].txt = gTxtBoxes.arr[gTxtBoxes.focusIdx].txt + e.key
                }
                break
            case 4: // game win stanje, pritisak na bilo koju tipku prebaci na meni
                gState = 0
                drawMenu()
                break
            default:
                break
        }
    }

    cvs.onkeyup = (e) => {
        if (gPltDir !== 0) { // platforma miruje
            gPltDir = 0
        }
    }

    cvs.onclick = (e) => {
        const mousePos = {
            x: e.clientX - ((document.body.clientWidth - cvs.width) / 2),
            y: e.clientY - ((document.body.clientHeight - cvs.height) / 2),
        }

        // postavi text box spreman za primanje user inputa ovisno poziciji klika miša
        for (let i = 0; i < gTxtBoxes.arr.length; i++) {
            if (gTxtBoxes.arr[i].state === gState && intersectRect(mousePos, gTxtBoxes.arr[i])) {
                if (gTxtBoxes.writeIdx >= 0) {
                    gTxtBoxes.arr[gTxtBoxes.writeIdx].write = false
                }
                gTxtBoxes.writeIdx = i
                return
            }
        }

        // prosljedi klik event na odgovarajući gumb
        for (let i = 0; i < gBtns.length; i++) {
            if (gBtns[i].state === gState && intersectRect(mousePos, gBtns[i])) {
                gBtns[i].onClick()
                return
            }
        }
    }

    // provjerava ako se miš nalazi iznad gumba ili text boxa i postavlja cursor style ovisno o slučaju
    cvs.onmousemove = (e) => {
        const mousePos = {
            x: e.clientX - ((document.body.clientWidth - cvs.width) / 2),
            y: e.clientY - ((document.body.clientHeight - cvs.height) / 2),
        }

        for (let i = 0; i < gBtns.length; i++) {
            if (gBtns[i].state === gState && intersectRect(mousePos, gBtns[i])) {
                cvs.style.cursor = "pointer"
                return
            }
        }

        for (let i = 0; i < gTxtBoxes.arr.length; i++) {
            if (gTxtBoxes.arr[i].state === gState && intersectRect(mousePos, gTxtBoxes.arr[i])) {
                if (gTxtBoxes.focusIdx >= 0) {
                    gTxtBoxes.arr[gTxtBoxes.focusIdx].focus = false
                }
                gTxtBoxes.focusIdx = i
                cvs.style.cursor = "pointer"
                return
            }
        }

        if (cvs.style.cursor !== "default") {
            cvs.style.cursor = "default"
        }
    }

    initBall()
    initPlatform()
    initBlocks()

    initBtn(0, "New game", cvs.width / 2, cvs.height - (0.6 * cvs.height), () => {
        gState = 1
        cvs.style.cursor = "default"
        drawGame()
    })
    initBtn(0, "Options", cvs.width / 2, cvs.height - (0.5 * cvs.height), () => {
        gState = 3
        cvs.style.cursor = "default"
        drawOptions()
    })
    initBtn(3, "Back", cvs.width / 2, cvs.height - (0.3 * cvs.height), () => {
        gState = 0
        cvs.style.cursor = "default"
        drawMenu()
    })
    initTxtBox(3, "Number of blocks:", `${conf.blocksNum}`, 4, cvs.width / 2, cvs.height - (0.6 * cvs.height), () => {
        conf.blockRows = Number(this.text)
        initBlocks()
    })
    initTxtBox(3, "Ball speed:", `${conf.ballSpeed}`, 4, cvs.width / 2, cvs.height - (0.5 * cvs.height), () => {
        conf.ballSpeed = Number(this.text)
        initBall()
    })
}

/* dodaje novi text box u globalnu listu
 * state - stanje igre, label - text prije user inputa, preTxt - input vrijednost
 * maxlen - max duljina inputa, x - x kordinata, y - y kordinata, onChande funkcija
 * kada se upiše neka vrijednost
*/
const initTxtBox = (state, label, preTxt, maxlen, x, y, onChange) => {
    ctx.font = "30px Arial"
    const wBox = ctx.measureText(label).width
    const wTxt = ctx.measureText(" ".repeat(maxlen)).width

    gTxtBoxes.arr.push({
        state: state,
        x: x - ((wBox + wTxt) / 2) - 8,
        y: y - (30 * 1.3 / 2) - 14,
        width: wBox + wTxt,
        height: 30 * 1.3,
        text: preTxt,
        focus: false,
        write: false,
        draw() {
            if (gState !== this.state) {
                return
            }
            if (this.text.length > maxlen) {
                this.text = this.text.substring(0, maxlen + 1)
            }
            ctx.font = "30px Arial"
            ctx.fillStyle = "black"
            ctx.textAlign = "right"
            ctx.fillText(label, x, y)
            if (this.write) {
                ctx.fillStyle = "green"
            }
            ctx.textAlign = "left"
            ctx.fillText(this.text, x + 20, y)
            ctx.textAlign = "center"
            if (this.focus || this.write) {
                ctx.strokeRect(this.x, this.y, this.width, this.height)
            }
            if (this.write) {
                ctx.fillStyle = "black"
            }
        },
        onChange: onChange.bind(this)
    })
}

/* dodaje novi text gumb u listu gumbova
 * state - stanje igre, str - text gumba, x - x kordinata, y - y kordinata, fn - funkcija kada se klikne na gumb
*/
const initBtn = (state, str, x, y, fn) => {
    ctx.font = "30px Arial"
    const wTxt = ctx.measureText(str).width
    const hTxt = 30 * 1.3
    const xr = x - (wTxt / 2) - 8
    const yr = y - (hTxt / 2) - 14
    const wr = wTxt + 16
    const hr = hTxt + 8

    gBtns.push({
        state: state,
        x: xr,
        y: yr,
        width: wr,
        height: hr,
        draw() {
            if (this.state !== gState) {
                return
            }
            ctx.font = "30px Arial"
            ctx.strokeStyle = "black"
            ctx.fillStyle = "black"
            ctx.fillText(str, x, y)
            ctx.beginPath()
            ctx.strokeRect(this.x, this.y, this.width, this.height)
        },
        onClick: fn,
    })
}

// crta menu 
const drawMenu = () => {
    // obriši cijeli kanvas
    ctx.clearRect(0, 0, cvs.width, cvs.height)

    // dohvati vrijednosti iz local storage-a
    const prevScr = localStorage.getItem("prev") || "0"
    const highScr = localStorage.getItem("high") || "0"

    ctx.font = "40px Arial"
    ctx.fillStyle = "black"
    ctx.textAlign = "center"
    ctx.fillText("Menu", cvs.width / 2, cvs.height - (0.8 * cvs.height))

    ctx.font = "20px Arial"
    gBtns.forEach(b => b.draw()) // crtaj svaki gumb koji spada u ovo stanje

    ctx.fillText(`High score: ${highScr}`, cvs.width / 2, cvs.height - (0.25 * cvs.height))
    ctx.fillText(`Prev score: ${prevScr}`, cvs.width / 2, cvs.height - (0.2 * cvs.height))

    raf = window.requestAnimationFrame(drawMenu)
}

// nacrtaj postavke meni
const drawOptions = () => {
    ctx.clearRect(0, 0, cvs.width, cvs.height)

    ctx.font = "40px Arial"
    ctx.fillStyle = "black"
    ctx.textAlign = "center"
    ctx.fillText("Options", cvs.width / 2, cvs.height - (0.8 * cvs.height))

    ctx.font = "20px Arial"
    gTxtBoxes.arr.forEach(b => b.draw()) // crtaj sve txt boxeve koje spadaju u ovo stanje
    gBtns.forEach(b => b.draw()) // crtaj svaki gumb koji spada u ovo stanje

    raf = window.requestAnimationFrame(drawOptions)
}

// nacrtaj igru
const drawGame = () => {
    ctx.clearRect(0, 0, cvs.width, cvs.height)

    gBlocks.draw() // nacrtaj sve blokove
    gPlatform.draw() // nacrtaj platformu
    gBall.draw() // nacrtaj loptu
    gBall.x += gBall.vx // promjeni x kordinatu lopte
    gBall.y += gBall.vy // promjeni y kordinatu lopte

    // prikaži score u desnom kutu igre
    const high = localStorage.getItem("high") || "0"
    ctx.font = "12px Arial"
    ctx.fillStyle = "black"
    ctx.textAlign = "right"
    ctx.fillText(`Score: ${gScore}`, cvs.width - 10, 20)
    ctx.fillText(`High score: ${high}`, cvs.width - 10, 30)
    ctx.textAlign = "center"

    if (gBall.y > cvs.height) { // ako lopta padne iza platforme
        gState = 2
        drawGameOver()
        return
    }
    if (gBlocks.broken === 0) { // ako su svi blokovi razbijeni
        gState = 4
        drawGameWin()
        return
    }
    // dalje slučajevi lopta odbijena od platforme, bočnih zidova i gornjeg zida
    if (intersectCircle(gBall, gPlatform)) {
        gBall.vy = gBall.vy > 0 ? -gBall.vy : gBall.vy
    }
    if ((gBall.y + gBall.vy) < gBall.radius) {
        gBall.vy = -gBall.vy
    }
    if ((gBall.x + gBall.vx) > (cvs.width - gBall.radius) || (gBall.x + gBall.vx) < gBall.radius) {
        gBall.vx = -gBall.vx
    }

    raf = window.requestAnimationFrame(drawGame)
}

// nacrtaj game win stanje
const drawGameWin = () => {
    window.cancelAnimationFrame(raf) // prekini animaciju

    // resetiraj samo potrebne parametre lopte, platforme i blokova
    const rad = Math.random() * (conf.ballStartAngleMax - conf.ballStartAngleMin) + conf.ballStartAngleMin
    gBall.vx = conf.ballSpeed * Math.cos(rad)
    gBall.vy = -conf.ballSpeed * Math.sin(rad)
    gBall.x = cvs.width / 2
    gBall.y = cvs.height - 30

    gPlatform.x = cvs.width / 2 - conf.platformWidth / 2
    gPlatform.y = cvs.height - conf.platformHeight - 10

    gBlocks.arr.forEach((row) => {
        row.forEach((block) => {
            block.life = block.startLife
        })
    })
    gBlocks.broken = conf.blocksNum

    // spremi score
    localStorage.setItem("prev", gScore)
    if (gScore > localStorage.getItem("high")) {
        localStorage.setItem("high", gScore)
    }

    // očisti kanvas i ispiši poruke
    ctx.clearRect(0, 0, cvs.width, cvs.height)
    ctx.font = "40px Arial"
    ctx.fillStyle = "green"
    ctx.textAlign = "center"
    ctx.fillText("Winner", cvs.width / 2, cvs.height - (0.6 * cvs.height))

    ctx.font = "20px Arial"
    ctx.fillStyle = "black"
    ctx.fillText("Press any key to return to menu", cvs.width / 2, cvs.height - (0.5 * cvs.height))

    ctx.font = "20px Arial"
    ctx.fillStyle = "black"
    ctx.fillText(`Score: ${gScore}`, cvs.width / 2, cvs.height - (0.4 * cvs.height))
}

// nacrtaj game over stanje
const drawGameOver = () => {
    window.cancelAnimationFrame(raf)

    // resetiraj samo potrebne parametre lopte, platforme i blokova
    const rad = Math.random() * (conf.ballStartAngleMax - conf.ballStartAngleMin) + conf.ballStartAngleMin
    gBall.vx = conf.ballSpeed * Math.cos(rad)
    gBall.vy = -conf.ballSpeed * Math.sin(rad)
    gBall.x = cvs.width / 2
    gBall.y = cvs.height - 30

    gPlatform.x = cvs.width / 2 - conf.platformWidth / 2
    gPlatform.y = cvs.height - conf.platformHeight - 10

    gBlocks.arr.forEach((row) => {
        row.forEach((block) => {
            block.life = block.startLife
        })
    })
    gBlocks.broken = conf.blocksNum

    // spremi novi rezultat
    localStorage.setItem("prev", gScore)
    if (gScore > localStorage.getItem("high")) {
        localStorage.setItem("high", gScore)
    }

    // očisti kanvas i ispiši poruke
    ctx.clearRect(0, 0, cvs.width, cvs.height)
    ctx.font = "40px Arial"
    ctx.fillStyle = "red"
    ctx.textAlign = "center"
    ctx.fillText("Game over", cvs.width / 2, cvs.height - (0.6 * cvs.height))

    ctx.font = "20px Arial"
    ctx.fillStyle = "black"
    ctx.fillText("Press any key to return to menu", cvs.width / 2, cvs.height - (0.5 * cvs.height))

    ctx.font = "20px Arial"
    ctx.fillStyle = "black"
    ctx.fillText(`Score: ${gScore}`, cvs.width / 2, cvs.height - (0.4 * cvs.height))
}

// kada se učita stranica
window.onload = () => {
    // postavi cvs na element kanvasa
    cvs = document.getElementById("cvs")
    // postavi ctx na 2d kontekst
    ctx = cvs.getContext("2d")

    startUp() // inicijalizacija svih potrebnih objekata i event listenera
    drawMenu() // prikaži početno stanje
}
