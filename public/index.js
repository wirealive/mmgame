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

    let url = `/guess/${roomId}/?a=${guessOne}&b=${guessTwo}&c=${guessThree}&d=${guessFour}`

    fetch(url).then(res => {
        return res.text();
    }).then(text => {
        //update the webpage with the guess here
        let newPTag = document.createElement('p');
        const [rightNumbers, rightPosition] = text.split(' ');

        guessResults = `Your guess was: ${guessOne} ${guessTwo} ${guessThree} ${guessFour}. `; 
        guessResults += `You guessed ${rightNumbers} right numbers. ${rightPosition} of those numbers are in their correct position.`;

        newPTag.innerText = guessResults;
        guessDiv.appendChild(newPTag);
        // the player has won!
        if(rightPosition === '4') {
            //tell the user they won
            alert('You won!');
            addPlayAgain();
        }
        const guessDivChildrenCount = guessDiv.getElementsByTagName('*').length;
        if(guessDivChildrenCount === 10) {
            alert('You lost. Try again!');
            addPlayAgain();
        }
    });
});

