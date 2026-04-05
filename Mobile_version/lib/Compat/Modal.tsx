import React from 'react';
import { Modal as RNModal, Platform, StyleSheet, View, type ModalProps } from 'react-native';

type Props = React.PropsWithChildren<ModalProps>;

const Modal: React.FC<Props> = ({ visible, transparent, children, ...rest }) => {
  if (Platform.OS !== 'windows') {
    return (
      <RNModal visible={visible} transparent={transparent} {...rest}>
        {children}
      </RNModal>
    );
  }

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.overlay, transparent ? styles.transparent : styles.solid]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  transparent: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  solid: {
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
});

export default Modal;
