import { CheckCircleIcon, CloseIcon, Icon } from "@chakra-ui/icons";
import {
  Center,
  Container,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { invoke } from "@tauri-apps/api";
import { Command } from "@tauri-apps/api/shell";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { MdOutlineKeyboard } from "react-icons/md";
import { info } from "tauri-plugin-log-api";
import { ActionButton, LanguageButton } from "./components";
import { DIM, LANGUAGES, LOGIC } from "./const";

export default function App() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const kbBtnRef = useRef<HTMLButtonElement>(null);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<keyof typeof LANGUAGES>("en");
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

  const handleLanguageChange = useCallback(
    (lang: keyof typeof LANGUAGES) => () => {
      setLanguage(lang);
      new Command("kb", ["engine", LANGUAGES[lang]]).execute();
    },
    []
  );

  useEffect(() => {
    new Command("kb", ["engine", ""]).execute().then((res) => {
      const lang = Object.entries(LANGUAGES).find(
        ([_, value]) => value === res.stdout
      )?.[0];

      if (lang) {
        info(`Detected language: ${lang}`);
        setLanguage(lang as any);
      }
    });
  }, []);

  const handleFocusChange = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    setLoading(true);

    info(`Submitting ${text}`);

    toast.promise(
      invoke("submit_sentence", {
        language,
        text,
      })
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
    <>
      <Container maxW={DIM.WIDTH} onClick={handleFocusChange}>
        <HStack>
          <VStack w={DIM.SIDE_BAR}>
            <ActionButton
              ref={kbBtnRef as any}
              aria-label="change-keyboard-layout"
              colorScheme="blue"
              icon={<Icon as={MdOutlineKeyboard} />}
              onClick={onOpen}
            />
          </VStack>
          <Container flex={1} maxW="container.lg">
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
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        placement="left"
        finalFocusRef={kbBtnRef}
        size="xs"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>Pick keyboard layout</DrawerHeader>
          <DrawerBody>
            <SimpleGrid columns={2} spacing={12} px={5}>
              {Object.keys(LANGUAGES).map((lang) => (
                <Center>
                  <LanguageButton
                    aspectRatio={1}
                    key={lang}
                    country={lang}
                    colorScheme="blue"
                    variant={lang === language ? "solid" : "outline"}
                    onClick={handleLanguageChange(lang as any)}
                  />
                </Center>
              ))}
            </SimpleGrid>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
