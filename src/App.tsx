import { CheckCircleIcon, CloseIcon } from "@chakra-ui/icons";
import {
  Container,
  Flex,
  HStack,
  IconButton,
  Text,
  Textarea,
  VStack,
  useColorMode,
} from "@chakra-ui/react";
import { ChangeEvent, useCallback, useRef, useState } from "react";
import { LanguageButton, ActionButton } from "./components";
import { DIM, LOGIC } from "./const";

export default function App() {
  const { setColorMode } = useColorMode();
  setColorMode("dark");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  const handleInputChange = useCallback((e: ChangeEvent) => {
    // @ts-ignore
    const inputValue = e.target.value;
    if (
      inputValue.length > LOGIC.SENTENCE_LIMIT ||
      inputValue.split("\n").length > 4
    )
      return;

    setText(inputValue);
  }, []);

  const handleInputClear = useCallback(() => {
    setText("");
    textareaRef.current?.focus();
  }, []);

  return (
    <Container maxW={DIM.WIDTH}>
      <HStack>
        <VStack w={DIM.SIDE_BAR} h={DIM.HEIGHT} justifyContent="space-around">
          <LanguageButton country="en" />
          <LanguageButton country="jp" />
        </VStack>
        <Container flex={1} maxW="container.md">
          <Flex direction="column" justifyContent="space-between">
            <Textarea
              ref={textareaRef}
              autoFocus
              flex={1}
              rows={5}
              maxLength={160}
              value={text}
              onChange={handleInputChange}
              resize="none"
              fontSize="4xl"
            />
            <Text ml="auto">
              {text.length} / {LOGIC.SENTENCE_LIMIT}
            </Text>
          </Flex>
        </Container>
        <VStack w={DIM.SIDE_BAR} h={DIM.HEIGHT} justifyContent="space-around">
          <ActionButton
            aria-label="Clear textarea"
            icon={<CloseIcon />}
            onClick={handleInputClear}
          />
          <ActionButton aria-label="Send text" icon={<CheckCircleIcon />} />
        </VStack>
      </HStack>
    </Container>
  );
}
