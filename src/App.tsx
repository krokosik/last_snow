import { CheckCircleIcon, CloseIcon } from "@chakra-ui/icons";
import {
  Button,
  Container,
  Flex,
  HStack,
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { invoke } from "@tauri-apps/api/core";
import { Event, listen } from "@tauri-apps/api/event";
import { appConfigDir } from "@tauri-apps/api/path";
import { Command } from "@tauri-apps/plugin-shell";
import { useFormik } from "formik";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActionButton, LanguageDrawer } from "./components";
import { DIM, LANGUAGES, LOGIC } from "./const";
import { info, warn } from "@tauri-apps/plugin-log";
import { Store } from "@tauri-apps/plugin-store";

export default function App() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const kbBtnRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [compositionData, setCompositionData] = useState<string>("");
  const [isComposing, setIsComposing] = useState<boolean>(false);

  const formik = useFormik({
    initialValues: {
      language: "en",
      text: "",
    },
    onSubmit: ({ text, language }) => {
      const textToSubmit = isComposing ? text + compositionData : text;
      if (textToSubmit.length === 0) {
        warn("Empty text submitted");
        return;
      }
      setLoading(true);

      info(`Composing: ${isComposing}, data: ${compositionData}`);
      info(`Submitting ${textToSubmit}`);

      toast.promise(
        invoke("submit_sentence", {
          language,
          text: textToSubmit,
        })
          .then(() => {
            formik.setFieldValue("text", "");
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
    },
  });

  useEffect(() => {
    Command.create("kb_check", "engine")
      .execute()
      .then((res) => {
        info(`Detected keyboard engine: ${res.stdout}`);
        const lang = Object.entries(LANGUAGES).find(
          ([_, value]) => res.stdout.indexOf(value) !== -1
        )?.[0];

        if (lang) {
          formik.setFieldValue("language", lang as any);
        }
      })
      .catch((err) => {
        warn(`Failed to detect language: ${err}`);
      });
  }, []);

  const handleFocusChange = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  // Periodically check if textarea is focused
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.activeElement !== textareaRef.current && !isOpen) {
        textareaRef.current?.focus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const toast = useToast();
  const [max_len, setMaxLen] = useState<number>(LOGIC.SENTENCE_LIMIT);
  const [isLoading, setLoading] = useState(false);

  const handleInputChange = useCallback(
    (e: ChangeEvent) => {
      // @ts-ignore
      const inputValue = e.target.value;
      if (
        inputValue.length > LOGIC.SENTENCE_LIMIT ||
        inputValue.split("\n").length > 4
      )
        return;

      formik.setFieldValue("text", inputValue);
    },
    [formik]
  );

  const handleInputClear = useCallback(() => {
    formik.setFieldValue("text", "");
  }, [formik]);

  const suppressTab = useCallback((e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  useEffect(() => {
    appConfigDir().then((dir) => {
      new Store(dir + "/.settings").get("max_characters").then((max) => {
        if (max) setMaxLen(+max);
      });
    });
    const unlisten = listen("max_characters", (event: Event<number>) => {
      setMaxLen(event.payload);
    });
    return () => void unlisten.then((u) => u());
  }, []);

  return (
    <form ref={formRef} onSubmit={formik.handleSubmit}>
      <HStack onClick={handleFocusChange}>
        <VStack w={DIM.SIDE_BAR}>
          <Button
            fontSize={DIM.BTN_FONT_SIZE}
            h={DIM.SIDE_BAR / 2}
            w={DIM.SIDE_BAR / 2}
            ref={kbBtnRef as any}
            aria-label="change-keyboard-layout"
            colorScheme="blue"
            textTransform="uppercase"
            onClick={onOpen}
          >
            {formik.values.language}
          </Button>
        </VStack>
        <Container flex={1} maxW="container.lg">
          <Flex direction="column" justifyContent="space-between">
            <Textarea
              ref={textareaRef}
              autoFocus
              flex={1}
              rows={4}
              maxLength={max_len}
              value={formik.values.text}
              isDisabled={isLoading}
              id="text"
              name="text"
              onChange={handleInputChange}
              resize="none"
              fontSize="4xl"
              onCompositionUpdate={(e) => setCompositionData(e.data)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={suppressTab}
            />
            <Text ml="auto">
              {formik.values.text.length} / {max_len}
            </Text>
          </Flex>
        </Container>
        <VStack w={DIM.SIDE_BAR} h={DIM.HEIGHT} justifyContent="space-around">
          <ActionButton
            aria-label="Clear textarea"
            colorScheme="red"
            isDisabled={formik.values.text.length === 0 || isLoading}
            icon={<CloseIcon />}
            onClick={handleInputClear}
          />
          <ActionButton
            isDisabled={formik.values.text.length < 1 || isComposing}
            isLoading={isLoading}
            colorScheme="green"
            aria-label="Send text"
            type="submit"
            icon={<CheckCircleIcon />}
          />
        </VStack>
      </HStack>
      <LanguageDrawer
        kbBtnRef={kbBtnRef}
        isOpen={isOpen}
        onClose={onClose}
        setLanguage={(language) => formik.setFieldValue("language", language)}
        language={formik.values.language as any}
      />
    </form>
  );
}
