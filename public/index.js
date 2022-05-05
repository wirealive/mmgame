const submitBtn = document.querySelector('#submit');

submitBtn.addEventListener('click', () => {
    const guessOne = document.querySelector('#guessOne').value;
    const guessTwo = document.querySelector('#guessTwo').value;
    const guessThree = document.querySelector('#guessThree').value;
    const guessFour = document.querySelector('#guessFour').value;

    const guessDiv = document.querySelector('#guesses');

    let url = `/guess?guessOne=${guessOne}&guessTwo=${guessTwo}&guessThree=${guessThree}&guessFour=${guessFour}`


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
    });
});

