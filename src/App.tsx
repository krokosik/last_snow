import { CheckCircleIcon, CloseIcon } from '@chakra-ui/icons';
import { Container, Flex, HStack, IconButton, Text, Textarea, VStack, useColorMode } from '@chakra-ui/react';
import { ChangeEvent, useCallback, useState } from 'react';
import { Gb, Jp } from 'react-flags-select';

const SIDE_WIDTH = 150;



export default function App() {
  const { setColorMode } = useColorMode();
  setColorMode('dark');

  const [text, setText] = useState('')

  const handleInputChange = useCallback((e: ChangeEvent) => {
    // @ts-ignore
    const inputValue = e.target.value;
    if (inputValue.split('\n').length > 4) return;
    setText(inputValue)
  }, [])

  return (
    <Container maxW={1280}>
      <HStack>
        <VStack w={SIDE_WIDTH} h="100vh" justifyContent="space-around">
          <IconButton w="full" fontSize={60} h={SIDE_WIDTH} aria-label='English keyboard layout' icon={<Gb />} />
          <IconButton w="full" fontSize={60} h={SIDE_WIDTH} aria-label='Japanese keyboard layout' icon={<Jp />} />
        </VStack>
        <Container flex={1} maxW="container.md">
          <Flex direction="column" justifyContent="space-between">
            <Textarea flex={1} rows={4} maxLength={160} value={text} onChange={handleInputChange} resize="none" fontSize="3xl">test</Textarea>
            <Text ml="auto">{text.length} / 160</Text>
          </Flex>
        </Container>
        <VStack w={SIDE_WIDTH} h="100vh" justifyContent="space-around">
          <IconButton w="full" fontSize={40} h={SIDE_WIDTH} aria-label='Clear textarea' icon={<CloseIcon />} />
          <IconButton w="full" fontSize={40} h={SIDE_WIDTH} aria-label='Send text' icon={<CheckCircleIcon />} />
        </VStack>
      </HStack>
    </Container>
  )
}