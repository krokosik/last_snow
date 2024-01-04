import { CheckCircleIcon, CloseIcon } from "@chakra-ui/icons";
import {
  Container,
  Flex,
  HStack,
  Text,
  Textarea,
  VStack,
  useColorMode,
  useToast,
} from "@chakra-ui/react";
import { ChangeEvent, useCallback, useRef, useState } from "react";
import { ActionButton, LanguageButton } from "./components";
import { DIM, LANGUAGES, LOGIC, SAMPLES } from "./const";
import { invoke } from "@tauri-apps/api";
import { info } from "tauri-plugin-log-api";

export default function App() {
  const { setColorMode } = useColorMode();
  const toast = useToast();
  setColorMode("dark");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<"en" | "jp">(LANGUAGES[0]);
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

  const handleLanguageChange = useCallback((lang: "en" | "jp") => {
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

    info(`Submitting ${text}`);

    const dummySubmitPromise = invoke("submit_sentence", {
      language,
      text,
    });

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
  }, [text, language]);

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
              onClick={() => text.length === 0 && setText(SAMPLES[language])}
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
