import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';

interface PostModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPost: (content: string) => void;
}

const PostModal: React.FC<PostModalProps> = ({ isVisible, onClose, onPost }) => {
  const [content, setContent] = useState('');

  const handlePost = () => {
    if (content.trim()) {
      onPost(content);
      setContent(''); // Clear the content after posting
    } else {
      Alert.alert('Empty Post', 'Please write something before posting.');
    }
  };

  return (
    <Modal
      presentationStyle="fullScreen"
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Text style={styles.title}>Create a Post</Text>

        <TextInput
          style={styles.textInput}
          placeholder="What's happening?"
          multiline
          value={content}
          onChangeText={setContent}
        />

        <TouchableOpacity onPress={handlePost} style={styles.postButton}>
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Cancel</Text>
        </TouchableOpacity> */}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    minHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    textAlignVertical: 'top', // Align text to the top-left corner
    fontSize: 16,
    marginBottom: 20,
  },
  postButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 10,
    alignSelf: 'center',
  },
  postButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  closeButton: {
    backgroundColor: '#ff3333',
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignSelf: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#fff',
  },
});

export default PostModal;
