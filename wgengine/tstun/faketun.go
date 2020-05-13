// Copyright (c) 2020 Tailscale Inc & AUTHORS All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package tstun

import (
	"io"
	"os"

	"github.com/tailscale/wireguard-go/tun"
)

type fakeTUN struct {
	datachan  chan []byte
	evchan    chan tun.Event
	closechan chan struct{}
}

// NewFakeTUN returns a fake TUN device that does not depend on the
// operating system or any special permissions.
// It primarily exists for testing.
func NewFakeTUN() tun.Device {
	return &fakeTUN{
		datachan:  make(chan []byte),
		evchan:    make(chan tun.Event),
		closechan: make(chan struct{}),
	}
}

func (t *fakeTUN) File() *os.File {
	panic("fakeTUN.File() called, which makes no sense")
}

func (t *fakeTUN) Close() error {
	close(t.closechan)
	close(t.datachan)
	close(t.evchan)
	return nil
}

func (t *fakeTUN) Read(out []byte, offset int) (int, error) {
	select {
	case <-t.closechan:
		return 0, io.EOF
	case b := <-t.datachan:
		copy(out[offset:offset+len(b)], b)
		return len(b), nil
	}
}

func (t *fakeTUN) Write(b []byte, n int) (int, error) {
	select {
	case <-t.closechan:
		return 0, ErrClosed
	case t.datachan <- b[n:]:
		return len(b), nil
	}
}

func (t *fakeTUN) Flush() error           { return nil }
func (t *fakeTUN) MTU() (int, error)      { return 1500, nil }
func (t *fakeTUN) Name() (string, error)  { return "FakeTUN", nil }
func (t *fakeTUN) Events() chan tun.Event { return t.evchan }
