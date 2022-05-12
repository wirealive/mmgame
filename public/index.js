const guessOneInput = document.querySelector('#guessOne');
const guessTwoInput = document.querySelector('#guessTwo');
const guessThreeInput = document.querySelector('#guessThree');
const guessFourInput = document.querySelector('#guessFour');

const roomId = window.location.pathname.split('/')[2];
const submitBtn = document.querySelector('#submit');
const guessDiv = document.querySelector('#guesses');

function addPlayAgain() {
    //disable the submit button
    submitBtn.disabled = true;
    // add a way to play again
    const playAgainLink = document.createElement('a');
    playAgainLink.innerText = 'Play Again';
    playAgainLink.setAttribute('href', '/');
    guessDiv.appendChild(playAgainLink);
}

submitBtn.addEventListener('click', () => {
    const guessOne = guessOneInput.value;
    const guessTwo = guessTwoInput.value;
    const guessThree = guessThreeInput.value;
    const guessFour = guessFourInput.value;

    let url = `/guess/${roomId}?a=${guessOne}&b=${guessTwo}&c=${guessThree}&d=${guessFour}`

    fetch(url).then(res => {
        return res.text();
    }).then(text => {
        //update the webpage with the guess here
        let newPTag = document.createElement('p');
        newPTag.innerText = text;
        guessDiv.appendChild(newPTag);

        console.log(text);
        if(text.trim() === "You Won!" || text.trim() === "You lost this game. Please start a new game.") {
            addPlayAgain();
        }
    })
    .catch(err => {
        // log err to datadog
        console.log(err);
    });
});

