import React, { useState } from 'react';
import {
  AspectRatio,
  ChakraProvider,
  Button,
  Stack,
  IconButton,
  Box,
  Grid,
  Text,
  VStack,
  Container,
  Radio,
  RadioGroup,
  theme,
} from '@chakra-ui/react';
import { ColorModeSwitcher } from './ColorModeSwitcher';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from "@chakra-ui/react"
import { MdEqualizer, MdPlayCircleFilled, MdPauseCircleFilled } from 'react-icons/md';

import workerScript from './worker';
import NoSleep from 'nosleep.js';

const noSleep = new NoSleep();

document.addEventListener('click', function enableNoSleep() {
  document.removeEventListener('click', enableNoSleep, false);
  noSleep.enable();
}, false);

const timerWorker = new Worker(workerScript);

function App() {
  const [tempo, setTempo] = useState(60);
  const [noteResolution, setNoteResolution] = useState("4");
  const [isPlaying, setIsPlaying] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  var audioContext = new AudioContext();
  var current16thNote = -1;        // What note is currently last scheduled?
  var scheduleAheadTime = 0.1;    // How far ahead to schedule audio (sec)
  // This is calculated from lookahead, and overlaps
  // with next interval (in case the timer is late)
  var nextNoteTime = 0.0;     // when the next note is due.

  var noteLength = 0.05;      // length of "beep" (in seconds)
  var notesInQueue = [];      // the notes that have been put into the web audio,
  // and may or may not have played yet. {note, time}

  timerWorker.onmessage = function(e) {
    if (e.data === "tick") {
      console.log("tick");
      scheduler();
    }
  };

  const nextNote = () => {
    // Advance current note and time by a 16th note...
    var secondsPerBeat = 60.0 / tempo;    // Notice this picks up the CURRENT
    // tempo value to calculate beat length.
    nextNoteTime += 0.25 * secondsPerBeat;    // Add beat length to last beat time

    current16thNote++;    // Advance the beat number, wrap to zero
    if (current16thNote === 16) {
      current16thNote = 0;
    }
  }

  const scheduleNote = (beatNumber, time) => {
    // push the note on the queue, even if we're not playing.
    notesInQueue.push({ note: beatNumber, time: time });

    const nr = parseInt(noteResolution);

    if ((nr === 8) && (beatNumber % 2 !== 0)) return; // we're not playing non-8th 16th notes
    if ((nr === 4) && (beatNumber % 4 !== 0)) return; // we're not playing non-quarter 8th notes

    // create an oscillator
    var osc = audioContext.createOscillator();
    osc.connect(audioContext.destination);
    if (beatNumber % 16 === 0)    // beat 0 == high pitch
      osc.frequency.value = 880.0;
    else if (beatNumber % 4 === 0)    // quarter notes = medium pitch
      osc.frequency.value = 440.0;
    else                        // other 16th notes = low pitch
      osc.frequency.value = 220.0;

    osc.start(time);
    osc.stop(time + noteLength);
  }

  const scheduler = () => {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
      scheduleNote(current16thNote, nextNoteTime);
      nextNote();
    }
  }

  function play() {
    if (!unlocked) {
      // play silent buffer to unlock the audio
      var buffer = audioContext.createBuffer(1, 1, 22050);
      var node = audioContext.createBufferSource();
      node.buffer = buffer;
      node.start(0);
      setUnlocked(true);
    }

    if (!isPlaying) { // start playing
      current16thNote = 0;
      nextNoteTime = audioContext.currentTime;
      timerWorker.postMessage("start");
    } else {
      timerWorker.postMessage("stop");
    }

    setIsPlaying(!isPlaying);
  }

  return (
    <ChakraProvider theme={theme}>
      <Container>
        <Box textAlign="center" fontSize="xl">
          <Grid minH="100vh" p={2}>
            <ColorModeSwitcher justifySelf="flex-end" />
            <VStack spacing={4}>
              <AspectRatio w="50%" ratio={4 / 4}>
                <IconButton
                  onClick={play}
                  color="red"
                  aria-label="Play/Pause"
                  fontSize={500}
                  variant="ghost"
                  icon={isPlaying ? <MdPauseCircleFilled /> : <MdPlayCircleFilled />}
                />
              </AspectRatio>
              <Text fontSize="xl">{tempo} bpm</Text>
              <Slider color="red" value={tempo} min={0} max={250} onChange={(newTempo) => setTempo(newTempo)}>
                <SliderTrack color="red">
                  <SliderFilledTrack bg="red" />
                </SliderTrack>
                <SliderThumb boxSize={6}>
                  <Box color="red" as={MdEqualizer} />
                </SliderThumb>
              </Slider>
              <Stack direction="row" spacing={4} align="center">
                <Button variant="outline" onClick={() => setTempo(tempo - 5)}>
                  -5
                </Button>
                <Button variant="outline" onClick={() => setTempo(tempo - 1)}>
                  -1
                </Button>
                <Button variant="outline" onClick={() => setTempo(tempo + 1)}>
                  +1
                </Button>
                <Button variant="outline" onClick={() => setTempo(tempo + 5)}>
                  +5
                </Button>
              </Stack>
              <RadioGroup onChange={setNoteResolution} value={noteResolution}>
                <Stack direction="row">
                  <Radio colorScheme="red" value="4">4ths</Radio>
                  <Radio colorScheme="red" value="8">8ths</Radio>
                  <Radio colorScheme="red" value="16">16ths</Radio>
                </Stack>
              </RadioGroup>
            </VStack>
          </Grid >
        </Box >
      </Container>
    </ChakraProvider >
  );
}

export default App;
