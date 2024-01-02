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
  useToast,
} from "@chakra-ui/react";
import { ChangeEvent, useCallback, useRef, useState } from "react";
import { LanguageButton, ActionButton } from "./components";
import { DIM, LANGUAGES, LOGIC } from "./const";

export default function App() {
  const { setColorMode } = useColorMode();
  const toast = useToast();
  setColorMode("dark");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [isLoading, setLoading] = useState(false);

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
  }, []);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
  }, []);

  const handleFocusChange = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    setLoading(true);

    const dummyPerspectiveAPIPromise = new Promise<void>((resolve, reject) =>
      setTimeout(() => (Math.random() > 0.1 ? resolve() : reject()), 1000)
    );

    const dummySubmitPromise = new Promise<void>((resolve) =>
      setTimeout(resolve, 1000)
    );

    toast.promise(
      dummyPerspectiveAPIPromise
        .then(() => dummySubmitPromise)
        .then(() => {
          setText("");
        })
        .finally(() => {
          setLoading(false);
        }),
      {
        success: {
          title: "Success!",
          description: "Your text has been submitted.",
        },
        loading: { title: "Submitting text..." },
        error: {
          title: "Failure",
          description: "Your text could not be submitted.",
        },
      }
    );
  }, []);

  return (
    <Container maxW={DIM.WIDTH} onClick={handleFocusChange}>
      <HStack>
        <VStack w={DIM.SIDE_BAR} h={DIM.HEIGHT} justifyContent="space-around">
          {LANGUAGES.map((lang) => (
            <LanguageButton
              key={lang}
              country={lang}
              colorScheme="blue"
              variant={lang === language ? "solid" : "outline"}
              onClick={() => handleLanguageChange(lang)}
            />
          ))}
        </VStack>
        <Container flex={1} maxW="container.md">
          <Flex direction="column" justifyContent="space-between">
            <Textarea
              ref={textareaRef}
              autoFocus
              flex={1}
              rows={4}
              maxLength={LOGIC.SENTENCE_LIMIT}
              value={text}
              isDisabled={isLoading}
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
            colorScheme="red"
            variant="outline"
            isDisabled={text.length === 0 || isLoading}
            icon={<CloseIcon />}
            onClick={handleInputClear}
          />
          <ActionButton
            isDisabled={text.length < 10}
            isLoading={isLoading}
            colorScheme="green"
            aria-label="Send text"
            onClick={handleSubmit}
            icon={<CheckCircleIcon />}
          />
        </VStack>
      </HStack>
    </Container>
  );
}
